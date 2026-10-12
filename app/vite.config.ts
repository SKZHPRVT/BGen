import { defineConfig } from "vite";

// GitHub Pages хостит проект по подпути /BGen/.
// В dev-режиме (vite) — корень /.
const isPages = process.env.GITHUB_PAGES === "1";

export default defineConfig({
  base: isPages ? "/BGen/" : "/",
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
  },
});