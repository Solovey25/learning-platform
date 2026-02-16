import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import vitePluginInjectDataLocator from "./plugins/vite-plugin-inject-data-locator";

export default defineConfig({
  plugins: [react(), vitePluginInjectDataLocator()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
