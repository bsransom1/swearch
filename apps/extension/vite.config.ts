import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Turns "http://localhost:3000, https://swearch.app/" into the JSON fragment
// "http://localhost:3000/*","https://swearch.app/*" used for content-script and
// externally_connectable match patterns in the manifest.
function buildWebAppMatches(raw: string): string {
  const fallback = "http://localhost:3000";
  const origins = (raw || fallback)
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  const unique = Array.from(new Set(origins.length > 0 ? origins : [fallback]));
  return unique.map((origin) => `"${origin}/*"`).join(",");
}

function injectManifestEnv(clientId: string, webAppOrigins: string): Plugin {
  return {
    name: "inject-manifest-env",
    closeBundle() {
      const manifestPath = resolve(__dirname, "dist/manifest.json");
      const manifest = readFileSync(manifestPath, "utf-8")
        .replace("__GOOGLE_CLIENT_ID__", clientId)
        .replaceAll('"__WEB_APP_MATCHES__"', buildWebAppMatches(webAppOrigins));
      writeFileSync(manifestPath, manifest);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID ?? "";
  const webAppOrigins = env.VITE_WEB_APP_ORIGINS ?? "";

  return {
  plugins: [react(), injectManifestEnv(googleClientId, webAppOrigins)],
  resolve: {
    alias: {
      "@swearch/shared": resolve(__dirname, "../../packages/shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        "content/auth-sync": resolve(__dirname, "src/content/auth-sync.ts"),
        "content/page-metadata": resolve(__dirname, "src/content/page-metadata.ts"),
        "background/service-worker": resolve(__dirname, "src/background/service-worker.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "[name].[ext]",
        manualChunks(id) {
          // Keep content/background entries self-contained (no shared chunks).
          if (id.includes("/content/") || id.includes("/background/")) {
            return undefined;
          }
          if (id.includes("parse-page-metadata")) {
            return "parse-page-metadata";
          }
        },
      },
    },
  },
  // Copy manifest.json and icons to dist
  publicDir: "public",
};
});
