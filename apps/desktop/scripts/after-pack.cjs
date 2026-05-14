const { spawnSync } = require("node:child_process");
const { existsSync, readdirSync } = require("node:fs");
const { homedir } = require("node:os");
const { basename, join, resolve } = require("node:path");

function findRcedit(startDir) {
  if (!existsSync(startDir)) {
    return null;
  }

  const entries = readdirSync(startDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(startDir, entry.name);

    if (entry.isFile() && entry.name === "rcedit-x64.exe") {
      return entryPath;
    }

    if (entry.isDirectory()) {
      const match = findRcedit(entryPath);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const productName = "Postman Clone";
  const version = context.packager.appInfo.version;
  const exePath = join(context.appOutDir, `${productName}.exe`);
  const iconPath = resolve(context.packager.projectDir, "assets/icon.ico");
  const localRcedit = resolve(context.packager.projectDir, "../../node_modules/rcedit/bin/rcedit-x64.exe");
  const cacheRoot = join(homedir(), "AppData/Local/electron-builder/Cache/winCodeSign");
  const rceditPath =
    process.env.POSTMAN_CLONE_RCEDIT ||
    (existsSync(localRcedit) ? localRcedit : null) ||
    findRcedit(cacheRoot);

  if (!rceditPath) {
    throw new Error(
      "Could not find rcedit-x64.exe. Package once with Electron Builder or set POSTMAN_CLONE_RCEDIT to rcedit-x64.exe.",
    );
  }

  const args = [
    exePath,
    "--set-version-string",
    "FileDescription",
    productName,
    "--set-version-string",
    "ProductName",
    productName,
    "--set-version-string",
    "CompanyName",
    productName,
    "--set-version-string",
    "InternalName",
    productName,
    "--set-version-string",
    "OriginalFilename",
    basename(exePath),
    "--set-file-version",
    version,
    "--set-product-version",
    version,
    "--set-icon",
    iconPath,
  ];

  const result = spawnSync(rceditPath, args, { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(`rcedit failed with exit code ${result.status}`);
  }
};
