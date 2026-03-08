import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Tauri sets TAURI_ENV_* environment variables during development
const isTauri = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Prevent Vite from obscuring Rust errors in Tauri dev mode
  clearScreen: false,

  server: {
    port: 5173,
    // Tauri expects a fixed port; fail if not available
    strictPort: true,
    proxy: isTauri ? undefined : {
      "/api": "http://127.0.0.1:5174",
    },
  },

  build: {
    outDir: "dist",
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_ENV_PLATFORM === "windows"
      ? "chrome105"
      : "safari14",
    // Debug builds produce source maps for better stack traces
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },

  // Environment variables prefixed with TAURI_ are exposed to the frontend
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
