import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

/**
 * Separate build for the in-page panel injector.
 *
 * The panel is injected via chrome.scripting.executeScript({ files }) which
 * runs as a classic script — ES module `import` statements fail silently.
 * This config bundles React + all panel code into a single self-contained IIFE.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@swearch/shared": resolve(__dirname, "../../packages/shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/content/panel-injector.ts"),
      output: {
        entryFileNames: "content/panel-injector.js",
        format: "iife",
        inlineDynamicImports: true,
        name: "SwearchPanel",
      },
    },
  },
});
