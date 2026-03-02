import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { extension: "src/extension.ts" },
    format: ["cjs"],
    outDir: "dist",
    external: ["vscode"],
    sourcemap: true,
    clean: true,
    noExternal: ["ws", "@open-agents/shared"],
  },
  {
    entry: { "mcp-server": "src/mcp/server.ts" },
    format: ["cjs"],
    outDir: "dist",
    sourcemap: true,
    noExternal: ["@open-agents/shared"],
  },
]);
