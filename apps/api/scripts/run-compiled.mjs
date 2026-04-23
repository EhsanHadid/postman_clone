import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const target = process.argv[2] ?? "main";

const candidatesByTarget = {
  main: [
    path.resolve("dist/main.js"),
    path.resolve("dist/apps/api/src/main.js"),
  ],
  migrate: [
    path.resolve("dist/database/migrate.js"),
    path.resolve("dist/apps/api/src/database/migrate.js"),
  ],
  seed: [
    path.resolve("dist/database/seed.js"),
    path.resolve("dist/apps/api/src/database/seed.js"),
  ],
};

const candidates = candidatesByTarget[target];

if (!candidates) {
  console.error(`Unknown compiled target: ${target}`);
  process.exit(1);
}

const resolvedPath = candidates.find((candidate) => existsSync(candidate));

if (!resolvedPath) {
  console.error(
    `Unable to locate compiled ${target} entry. Checked:\n${candidates.join("\n")}`,
  );
  process.exit(1);
}

await import(pathToFileURL(resolvedPath).href);
