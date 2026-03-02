import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/index.ts" },
  format: ["cjs"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  noExternal: ["@open-agents/shared"],
});
