import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const stamp = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(0, 14);

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");
const builderCli = resolve(
  repoRoot,
  "node_modules/electron-builder/out/cli/cli.js",
);

const child = spawn(
  process.execPath,
  [builderCli, `--config.directories.output=release-desktop-${stamp}`],
  {
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
    },
    stdio: "inherit",
    shell: false,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
