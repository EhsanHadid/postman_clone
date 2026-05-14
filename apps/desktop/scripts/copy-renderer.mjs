import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(scriptDir, "..");
const repoRoot = resolve(desktopRoot, "../..");
const source = resolve(repoRoot, "apps/web/dist");
const target = resolve(desktopRoot, "dist/renderer");

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
