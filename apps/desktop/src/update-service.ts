import { BrowserWindow, app, dialog, shell } from "electron";
import { createWriteStream, mkdirSync } from "node:fs";
import { basename, join } from "node:path";
import { get } from "node:https";

type DesktopPlatform = "windows" | "linux" | "macos";

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  body?: string;
  assets?: GitHubReleaseAsset[];
}

interface UpdateManifest {
  enabled?: boolean;
  version?: string;
  tag?: string;
  notes?: string;
  url?: string;
  urls?: Partial<Record<DesktopPlatform, string>>;
}

interface UpdateCandidate {
  version: string;
  notes: string;
  downloadUrl: string;
}

const defaultReleaseRepo = "EhsanHadid/postman_clone";
const updateCheckIntervalMs = 6 * 60 * 60 * 1000;
let lastPromptedVersion: string | null = null;
let checkInProgress = false;

export function scheduleUpdateChecks(window: BrowserWindow) {
  if (!shouldCheckForUpdates()) {
    return;
  }

  setTimeout(() => {
    void checkForUpdates(window);
  }, 5_000);

  setInterval(() => {
    void checkForUpdates(window);
  }, updateCheckIntervalMs);
}

async function checkForUpdates(window: BrowserWindow) {
  if (checkInProgress) {
    return;
  }

  checkInProgress = true;

  try {
    const candidate = await resolveUpdateCandidate();
    if (!candidate || candidate.version === lastPromptedVersion) {
      return;
    }

    lastPromptedVersion = candidate.version;
    const shouldInstall = await promptForUpdate(window, candidate);
    if (shouldInstall) {
      await downloadAndLaunchInstaller(window, candidate);
    }
  } catch (error) {
    console.warn("Update check failed:", error);
  } finally {
    checkInProgress = false;
  }
}

function shouldCheckForUpdates() {
  if (process.env.POSTMAN_CLONE_DISABLE_UPDATE_CHECK === "1") {
    return false;
  }

  return app.isPackaged || process.env.POSTMAN_CLONE_ENABLE_DEV_UPDATE_CHECK === "1";
}

async function resolveUpdateCandidate(): Promise<UpdateCandidate | null> {
  const manifestUrl = process.env.POSTMAN_CLONE_UPDATE_MANIFEST_URL?.trim();
  const candidate = manifestUrl
    ? await readManifestUpdate(manifestUrl)
    : await readGitHubReleaseUpdate();

  if (!candidate) {
    return null;
  }

  return compareVersions(candidate.version, app.getVersion()) > 0 ? candidate : null;
}

async function readManifestUpdate(url: string): Promise<UpdateCandidate | null> {
  const manifest = await requestJson<UpdateManifest>(url);
  if (manifest.enabled === false) {
    return null;
  }

  const version = normalizeVersion(manifest.version ?? manifest.tag ?? "");
  const downloadUrl = selectManifestUrl(manifest);
  if (!version || !downloadUrl) {
    return null;
  }

  return {
    version,
    notes: manifest.notes ?? "",
    downloadUrl,
  };
}

async function readGitHubReleaseUpdate(): Promise<UpdateCandidate | null> {
  const repo = process.env.POSTMAN_CLONE_UPDATE_REPO?.trim() || defaultReleaseRepo;
  const release = await requestJson<GitHubRelease>(
    `https://api.github.com/repos/${repo}/releases/latest`,
  );
  const version = normalizeVersion(release.tag_name);
  const asset = selectReleaseAsset(release.assets ?? []);

  if (!version || !asset) {
    return null;
  }

  return {
    version,
    notes: release.body ?? "",
    downloadUrl: asset.browser_download_url,
  };
}

function selectManifestUrl(manifest: UpdateManifest): string | null {
  const urls = manifest.urls ?? {};
  return urls[getDesktopPlatform()] ?? manifest.url ?? null;
}

function selectReleaseAsset(assets: GitHubReleaseAsset[]) {
  const platform = getDesktopPlatform();

  if (platform === "windows") {
    return assets.find((asset) => /windows|win/i.test(asset.name) && /\.exe$/i.test(asset.name));
  }

  if (platform === "linux") {
    return assets.find((asset) => /linux/i.test(asset.name) && /\.deb$/i.test(asset.name));
  }

  return assets.find((asset) => /macos|mac|darwin/i.test(asset.name) && /\.(dmg|zip)$/i.test(asset.name));
}

function getDesktopPlatform(): DesktopPlatform {
  if (process.platform === "linux") {
    return "linux";
  }

  if (process.platform === "darwin") {
    return "macos";
  }

  return "windows";
}

async function promptForUpdate(window: BrowserWindow, candidate: UpdateCandidate) {
  const releaseNotes = candidate.notes.trim();
  const detail = [
    `Current version: ${app.getVersion()}`,
    `Available version: ${candidate.version}`,
    releaseNotes ? `\n${truncate(releaseNotes, 900)}` : "",
  ].join("\n");

  const result = await dialog.showMessageBox(window, {
    type: "info",
    buttons: ["Install Update", "Later"],
    cancelId: 1,
    defaultId: 0,
    title: "Update Available",
    message: "A new version of Postman Clone is available.",
    detail,
  });

  return result.response === 0;
}

async function downloadAndLaunchInstaller(window: BrowserWindow, candidate: UpdateCandidate) {
  let installerPath: string;

  try {
    installerPath = await downloadInstaller(window, candidate);
  } catch (error) {
    await dialog.showMessageBox(window, {
      type: "error",
      buttons: ["Close"],
      title: "Unable to Download Update",
      message: "The update could not be downloaded.",
      detail: getErrorMessage(error),
    });
    return;
  }

  const launchError = await shell.openPath(installerPath);

  if (launchError) {
    await dialog.showMessageBox(window, {
      type: "error",
      buttons: ["Close"],
      title: "Unable to Start Update",
      message: "The update was downloaded, but the installer could not be opened.",
      detail: launchError,
    });
    return;
  }

  setTimeout(() => app.quit(), 750);
}

async function downloadInstaller(window: BrowserWindow, candidate: UpdateCandidate) {
  const updatesDir = join(app.getPath("temp"), "postman-clone-updates");
  mkdirSync(updatesDir, { recursive: true });

  const fileName = basename(new URL(candidate.downloadUrl).pathname) ||
    `Postman-Clone-Desktop-v${candidate.version}`;
  const destination = join(updatesDir, fileName);

  try {
    await downloadFile(candidate.downloadUrl, destination, (progress) => {
      window.setProgressBar(progress);
    });
  } finally {
    window.setProgressBar(-1);
  }

  return destination;
}

function downloadFile(
  url: string,
  destination: string,
  onProgress: (progress: number) => void,
  redirectsRemaining = 5,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = get(url, createRequestOptions(), (response) => {
      const redirectUrl = response.headers.location;
      if (redirectUrl && [301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
        response.resume();
        if (redirectsRemaining <= 0) {
          reject(new Error("Too many redirects while downloading update."));
          return;
        }

        downloadFile(new URL(redirectUrl, url).toString(), destination, onProgress, redirectsRemaining - 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if ((response.statusCode ?? 0) >= 400) {
        response.resume();
        reject(new Error(`Update download failed with status ${response.statusCode}.`));
        return;
      }

      const totalBytes = Number(response.headers["content-length"] ?? 0);
      let downloadedBytes = 0;
      const file = createWriteStream(destination);

      response.on("data", (chunk: Buffer) => {
        downloadedBytes += chunk.byteLength;
        if (totalBytes > 0) {
          onProgress(Math.min(downloadedBytes / totalBytes, 0.99));
        }
      });

      response.pipe(file);
      file.on("finish", () => {
        file.close(() => resolve());
      });
      file.on("error", reject);
    });

    request.on("error", reject);
    request.end();
  });
}

function requestJson<T>(url: string, redirectsRemaining = 5): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = get(url, createRequestOptions(), (response) => {
      const redirectUrl = response.headers.location;
      if (redirectUrl && [301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
        response.resume();
        if (redirectsRemaining <= 0) {
          reject(new Error("Too many redirects while checking for updates."));
          return;
        }

        requestJson<T>(new URL(redirectUrl, url).toString(), redirectsRemaining - 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if ((response.statusCode ?? 0) >= 400) {
        response.resume();
        reject(new Error(`Update check failed with status ${response.statusCode}.`));
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
    request.end();
  });
}

function createRequestOptions() {
  return {
    headers: {
      "User-Agent": `PostmanClone/${app.getVersion()}`,
      Accept: "application/vnd.github+json, application/json",
    },
  };
}

function normalizeVersion(value: string) {
  return value.trim().replace(/^v-?/i, "");
}

function compareVersions(left: string, right: string) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  const partCount = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < partCount; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function versionParts(value: string) {
  return normalizeVersion(value)
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown update error.";
}
