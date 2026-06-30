// Shared auth-sync protocol between the web app and the Chrome extension.
//
// Both surfaces authenticate against the same Supabase project, but they store
// the session differently: the web app keeps it in HTTP cookies (via
// @supabase/ssr) while the extension keeps it in chrome.storage.local. Neither
// can read the other's storage directly, so they exchange the underlying
// Supabase tokens over a small message protocol to stay in lockstep.
//
// Direction of travel:
//   web -> extension : window/web calls chrome.runtime.sendMessage(EXTENSION_ID)
//   extension -> web : service worker -> auth-sync content script -> page postMessage
//
// This module is intentionally free of any chrome/window/DOM dependencies so it
// can be imported from the extension service worker, content scripts, popup,
// and the Next.js web app alike.

export const AUTH_SYNC_SOURCE = "swearch-auth-sync" as const;

export const AuthSyncMessageType = {
  // Carries a live Supabase session (access + refresh token).
  Session: "SWEARCH_AUTH_SESSION",
  // Signals that the session was destroyed and the receiver should sign out.
  SignOut: "SWEARCH_AUTH_SIGN_OUT",
  // Asks the holder of the session to (re)broadcast it. Used by the extension
  // content script on load to pull an existing web session into the extension.
  RequestSession: "SWEARCH_AUTH_REQUEST_SESSION",
} as const;

export type AuthSyncMessageType =
  (typeof AuthSyncMessageType)[keyof typeof AuthSyncMessageType];

export interface AuthSessionTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthSessionMessage extends AuthSessionTokens {
  source: typeof AUTH_SYNC_SOURCE;
  type: typeof AuthSyncMessageType.Session;
}

export interface AuthSignOutMessage {
  source: typeof AUTH_SYNC_SOURCE;
  type: typeof AuthSyncMessageType.SignOut;
}

export interface AuthRequestSessionMessage {
  source: typeof AUTH_SYNC_SOURCE;
  type: typeof AuthSyncMessageType.RequestSession;
}

export type AuthSyncMessage =
  | AuthSessionMessage
  | AuthSignOutMessage
  | AuthRequestSessionMessage;

export function isAuthSyncMessage(value: unknown): value is AuthSyncMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.source === AUTH_SYNC_SOURCE &&
    typeof candidate.type === "string" &&
    (Object.values(AuthSyncMessageType) as string[]).includes(candidate.type)
  );
}

export function makeSessionMessage(
  tokens: AuthSessionTokens
): AuthSessionMessage {
  return {
    source: AUTH_SYNC_SOURCE,
    type: AuthSyncMessageType.Session,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  };
}

export function makeSignOutMessage(): AuthSignOutMessage {
  return { source: AUTH_SYNC_SOURCE, type: AuthSyncMessageType.SignOut };
}

export function makeRequestSessionMessage(): AuthRequestSessionMessage {
  return { source: AUTH_SYNC_SOURCE, type: AuthSyncMessageType.RequestSession };
}

// Parses a comma-separated origin list (e.g. from VITE_WEB_APP_ORIGINS) into a
// normalized, deduplicated array. Falls back to localhost dev when empty.
export function parseWebAppOrigins(raw?: string | null): string[] {
  const fallback = "http://localhost:3000";
  const origins = (raw ?? fallback)
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return Array.from(new Set(origins.length > 0 ? origins : [fallback]));
}

// Turns an origin into a chrome content-script/externally_connectable match
// pattern (e.g. "http://localhost:3000" -> "http://localhost:3000/*").
export function originToMatchPattern(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/*`;
}
