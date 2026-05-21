import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

const rootPackageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../package.json"), "utf8"),
) as { version: string };

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@postman-clone/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts",
      ),
      "@postman-clone/shared-utils": path.resolve(
        __dirname,
        "../../packages/shared-utils/src/index.ts",
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
