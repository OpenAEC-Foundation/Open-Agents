import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@frontend": resolve(__dirname, "../frontend/src"),
    },
  },
  build: {
    outDir: resolve(__dirname, "../vscode-extension/media"),
    emptyOutDir: false,
    // Inline fonts as data URIs so no separate font files needed in webview
    assetsInlineLimit: 200_000,
    rollupOptions: {
      output: {
        entryFileNames: "webview.js",
        assetFileNames: "webview.[ext]",
        // Single chunk for webview (no code splitting)
        manualChunks: undefined,
      },
    },
    cssCodeSplit: false,
  },
});
