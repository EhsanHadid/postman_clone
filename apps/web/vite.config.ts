import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@postman-clone/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src",
      ),
      "@postman-clone/shared-utils": path.resolve(
        __dirname,
        "../../packages/shared-utils/src",
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
