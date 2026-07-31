import { defineConfig } from "vite";
import { resolve } from "path";

/** In-page sidebar toggle script (IIFE, no React). */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/content/sidebar-injector.ts"),
      output: {
        entryFileNames: "content/sidebar-injector.js",
        format: "iife",
        inlineDynamicImports: true,
        name: "SwearchSidebar",
      },
    },
  },
});
