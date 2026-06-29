import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

function injectManifestEnv(clientId: string): Plugin {
  return {
    name: "inject-manifest-env",
    closeBundle() {
      const manifestPath = resolve(__dirname, "dist/manifest.json");
      const manifest = readFileSync(manifestPath, "utf-8").replace(
        "__GOOGLE_CLIENT_ID__",
        clientId
      );
      writeFileSync(manifestPath, manifest);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID ?? "";

  return {
  plugins: [react(), injectManifestEnv(googleClientId)],
  resolve: {
    alias: {
      "@swearch/shared": resolve(__dirname, "../../packages/shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        "content/content-script": resolve(__dirname, "src/content/content-script.ts"),
        "background/service-worker": resolve(__dirname, "src/background/service-worker.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  // Copy manifest.json and icons to dist
  publicDir: "public",
};
});
