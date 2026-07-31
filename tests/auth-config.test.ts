/**
 * Static configuration checks for unified auth. Run after building the extension
 * and before manual E2E testing in Chrome.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseWebAppOrigins, originToMatchPattern } from "../packages/shared/constants/auth-sync";

const ROOT = resolve(import.meta.dirname, "..");

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

describe("auth configuration alignment", () => {
  const manifest = readJson(resolve(ROOT, "apps/extension/dist/manifest.json"));
  const webEnv = readEnvFile(resolve(ROOT, "apps/web/.env.local"));
  const extEnv = readEnvFile(resolve(ROOT, "apps/extension/.env.local"));

  it("extension dist includes auth-sync content script and externally_connectable", () => {
    // The store build strips localhost from the origin list, so assert on shape
    // and consistency rather than on a specific origin.
    const authSyncScript = manifest.content_scripts?.find((cs: { js?: string[] }) =>
      cs.js?.includes("content/auth-sync.js")
    );
    expect(authSyncScript).toBeTruthy();
    expect(authSyncScript.matches.length).toBeGreaterThan(0);
    for (const pattern of authSyncScript.matches) {
      expect(pattern).toMatch(/^https?:\/\/[^/]+\/\*$/);
    }
    expect(manifest.externally_connectable?.matches).toEqual(authSyncScript.matches);
  });

  it("built auth-sync and service worker artifacts exist", () => {
    expect(existsSync(resolve(ROOT, "apps/extension/dist/content/auth-sync.js"))).toBe(true);
    expect(existsSync(resolve(ROOT, "apps/extension/dist/background/service-worker.js"))).toBe(true);
  });

  it("web app has NEXT_PUBLIC_EXTENSION_ID configured", () => {
    expect(webEnv.NEXT_PUBLIC_EXTENSION_ID).toBeTruthy();
    expect(webEnv.NEXT_PUBLIC_EXTENSION_ID).toMatch(/^[a-z]{32}$/);
  });

  it("both apps point at the same Supabase project", () => {
    expect(webEnv.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy();
    expect(extEnv.VITE_SUPABASE_URL).toBe(webEnv.NEXT_PUBLIC_SUPABASE_URL);
    expect(extEnv.VITE_SUPABASE_ANON_KEY).toBe(webEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  });

  it("extension service worker bundles auth-sync handlers", () => {
    const sw = readFileSync(
      resolve(ROOT, "apps/extension/dist/background/service-worker.js"),
      "utf-8"
    );
    const swSource = readFileSync(
      resolve(ROOT, "apps/extension/src/background/service-worker.ts"),
      "utf-8"
    );
    expect(sw).toContain("onMessageExternal");
    expect(swSource).toContain("onMessageExternal");
    expect(swSource).toContain("AuthSyncMessageType.Session");
    expect(swSource).toContain("AuthSyncMessageType.SignOut");
  });

  it("auth-sync content script relays messages to the page", () => {
    const cs = readFileSync(
      resolve(ROOT, "apps/extension/dist/content/auth-sync.js"),
      "utf-8"
    );
    const csSource = readFileSync(
      resolve(ROOT, "apps/extension/src/content/auth-sync.ts"),
      "utf-8"
    );
    expect(cs).toContain("postMessage");
    expect(csSource).toContain("makeRequestSessionMessage");
    expect(csSource).toContain("window.postMessage");
  });

  it("web layout includes AuthSyncProvider", () => {
    const layout = readFileSync(resolve(ROOT, "apps/web/app/layout.tsx"), "utf-8");
    expect(layout).toContain("AuthSyncProvider");
  });

  it("extension AuthView exposes Google sign-in", () => {
    const authView = readFileSync(
      resolve(ROOT, "apps/extension/src/popup/views/AuthView.tsx"),
      "utf-8"
    );
    expect(authView).toContain("signInWithGoogle");
    expect(authView).toContain("Continue with Google");
  });

  it("manifest oauth2 client is separate from Supabase Google provider", () => {
    // Drive/Docs uses manifest oauth2 + getAuthToken; Supabase Google login uses
    // launchWebAuthFlow with the Supabase-configured web OAuth client.
    expect(manifest.oauth2?.client_id).toBeTruthy();
    expect(manifest.oauth2.client_id).toBe(extEnv.VITE_GOOGLE_CLIENT_ID);
  });

  it("configured web origins include localhost dev and resolve to match patterns", () => {
    const origins = parseWebAppOrigins(extEnv.VITE_WEB_APP_ORIGINS);
    expect(origins).toContain("http://localhost:3000");
    expect(originToMatchPattern("http://localhost:3000")).toBe("http://localhost:3000/*");
    expect(origins.map(originToMatchPattern)).toContain("https://swearch.app/*");
  });
});
