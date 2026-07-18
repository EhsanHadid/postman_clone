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

type UpdateProgressState = {
  title: string;
  message: string;
  progress: number | null;
  detail?: string;
};

type DownloadProgress = {
  progress: number | null;
  downloadedBytes: number;
  totalBytes: number | null;
};

const defaultReleaseRepo = "EhsanHadid/postman_clone";
const updateCheckIntervalMs = 6 * 60 * 60 * 1000;
let lastPromptedVersion: string | null = null;
let checkInProgress = false;

class UpdateProgressDialog {
  private window: BrowserWindow | null = null;

  async show(parent: BrowserWindow, candidate: UpdateCandidate) {
    this.window = new BrowserWindow({
      parent,
      modal: true,
      title: "Updating Postman Clone",
      width: 440,
      height: 292,
      minWidth: 440,
      minHeight: 292,
      resizable: false,
      maximizable: false,
      minimizable: false,
      closable: false,
      fullscreenable: false,
      autoHideMenuBar: true,
      show: false,
      backgroundColor: "#15181d",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    this.window.once("ready-to-show", () => this.window?.show());
    this.window.once("closed", () => {
      this.window = null;
    });

    await this.window.loadURL(createUpdateProgressHtml(candidate));
  }

  update(state: UpdateProgressState) {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }

    void this.window.webContents.executeJavaScript(
      `window.updateProgressState(${JSON.stringify(state)});`,
    );
  }

  close() {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }

    this.window.close();
    this.window = null;
  }
}

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
  const progressDialog = new UpdateProgressDialog();

  await progressDialog.show(window, candidate);
  progressDialog.update({
    title: "Preparing update",
    message: `Getting Postman Clone ${candidate.version} ready.`,
    progress: null,
  });

  try {
    installerPath = await downloadInstaller(window, candidate, (progress) => {
      const percent = progress.progress === null ? null : Math.round(progress.progress * 100);
      progressDialog.update({
        title: "Downloading update",
        message: percent === null
          ? "Downloading the installer."
          : `Downloading the installer (${percent}%).`,
        progress: progress.progress,
        detail: formatDownloadProgress(progress),
      });
    });
  } catch (error) {
    progressDialog.update({
      title: "Download failed",
      message: "The update could not be downloaded.",
      progress: null,
      detail: getErrorMessage(error),
    });
    await dialog.showMessageBox(window, {
      type: "error",
      buttons: ["Close"],
      title: "Unable to Download Update",
      message: "The update could not be downloaded.",
      detail: getErrorMessage(error),
    });
    progressDialog.close();
    return;
  }

  progressDialog.update({
    title: "Opening installer",
    message: "The update has downloaded. Opening the installer now.",
    progress: 1,
    detail: basename(installerPath),
  });

  const launchError = await shell.openPath(installerPath);

  if (launchError) {
    progressDialog.update({
      title: "Installer could not start",
      message: "The update was downloaded, but the installer could not be opened.",
      progress: 1,
      detail: launchError,
    });
    await dialog.showMessageBox(window, {
      type: "error",
      buttons: ["Close"],
      title: "Unable to Start Update",
      message: "The update was downloaded, but the installer could not be opened.",
      detail: launchError,
    });
    progressDialog.close();
    return;
  }

  progressDialog.update({
    title: "Installer opened",
    message: "Postman Clone will close so the installer can finish the update.",
    progress: 1,
  });

  setTimeout(() => app.quit(), 750);
}

async function downloadInstaller(
  window: BrowserWindow,
  candidate: UpdateCandidate,
  onDownloadProgress: (progress: DownloadProgress) => void,
) {
  const updatesDir = join(app.getPath("temp"), "postman-clone-updates");
  mkdirSync(updatesDir, { recursive: true });

  const fileName = basename(new URL(candidate.downloadUrl).pathname) ||
    `Postman-Clone-Desktop-v${candidate.version}`;
  const destination = join(updatesDir, fileName);

  try {
    await downloadFile(candidate.downloadUrl, destination, (progress) => {
      onDownloadProgress(progress);
      window.setProgressBar(progress.progress ?? 2);
    });
  } finally {
    window.setProgressBar(-1);
  }

  return destination;
}

function downloadFile(
  url: string,
  destination: string,
  onProgress: (progress: DownloadProgress) => void,
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
        onProgress({
          progress: totalBytes > 0 ? Math.min(downloadedBytes / totalBytes, 0.99) : null,
          downloadedBytes,
          totalBytes: totalBytes > 0 ? totalBytes : null,
        });
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

function createUpdateProgressHtml(candidate: UpdateCandidate) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
    <title>Updating Postman Clone</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Segoe UI", system-ui, sans-serif;
        background: #15181d;
        color: #e3e7ec;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: #15181d;
      }

      main {
        display: grid;
        gap: 18px;
        padding: 28px;
      }

      .eyebrow {
        color: #88919e;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        color: #f3f6fa;
        font-size: 22px;
        font-weight: 700;
        line-height: 1.2;
      }

      p {
        margin: 0;
        color: #bcc4cf;
        line-height: 1.45;
      }

      .version-row {
        display: flex;
        gap: 10px;
        color: #bcc4cf;
        font-size: 13px;
      }

      .version-pill {
        border: 1px solid #303642;
        background: #20242a;
        padding: 5px 8px;
      }

      .progress-track {
        width: 100%;
        height: 10px;
        overflow: hidden;
        border: 1px solid #303642;
        background: #20242a;
      }

      .progress-fill {
        width: 0%;
        height: 100%;
        background: #ff6c37;
        transition: width 180ms ease;
      }

      .progress-track.is-indeterminate .progress-fill {
        width: 38%;
        animation: indeterminate 1.15s ease-in-out infinite;
      }

      .detail {
        min-height: 20px;
        color: #88919e;
        font-size: 12px;
      }

      @keyframes indeterminate {
        0% {
          transform: translateX(-110%);
        }

        100% {
          transform: translateX(280%);
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Postman Clone update</div>
      <div>
        <h1 id="title">Preparing update</h1>
        <p id="message">Getting the installer ready.</p>
      </div>
      <div class="version-row">
        <span class="version-pill">Current ${escapeHtml(app.getVersion())}</span>
        <span class="version-pill">New ${escapeHtml(candidate.version)}</span>
      </div>
      <div>
        <div class="progress-track is-indeterminate" id="track">
          <div class="progress-fill" id="fill"></div>
        </div>
        <div class="detail" id="detail"></div>
      </div>
    </main>
    <script>
      const title = document.getElementById("title");
      const message = document.getElementById("message");
      const track = document.getElementById("track");
      const fill = document.getElementById("fill");
      const detail = document.getElementById("detail");

      window.updateProgressState = (state) => {
        title.textContent = state.title;
        message.textContent = state.message;
        detail.textContent = state.detail || "";

        if (typeof state.progress === "number") {
          track.classList.remove("is-indeterminate");
          fill.style.width = Math.max(0, Math.min(100, state.progress * 100)) + "%";
        } else {
          track.classList.add("is-indeterminate");
          fill.style.width = "";
        }
      };
    </script>
  </body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
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

function formatDownloadProgress(progress: DownloadProgress) {
  if (progress.totalBytes === null) {
    return `${formatBytes(progress.downloadedBytes)} downloaded`;
  }

  return `${formatBytes(progress.downloadedBytes)} of ${formatBytes(progress.totalBytes)}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown update error.";
}
