import type { Session } from "@supabase/supabase-js";
import {
  type AuthSessionTokens,
  type AuthSyncMessage,
  makeSessionMessage,
  makeSignOutMessage,
  originToMatchPattern,
  parseWebAppOrigins,
} from "@swearch/shared/constants/auth-sync";
import { supabase } from "./supabase";

// Web-app origins this extension is allowed to sync sessions with. Configured at
// build time via VITE_WEB_APP_ORIGINS (comma-separated) so prod/staging hosts
// can be added without code changes; defaults to localhost dev.
export const WEB_APP_ORIGINS = parseWebAppOrigins(
  import.meta.env.VITE_WEB_APP_ORIGINS
);

const WEB_APP_TAB_MATCHES = WEB_APP_ORIGINS.map(originToMatchPattern);

// Canonical session cache used across the extension. The Supabase
// chromeStorageAdapter also persists its own session key; these explicit keys
// let popup/service-worker code read tokens without parsing Supabase internals.
export async function persistSessionCache(session: Session): Promise<void> {
  await chrome.storage.local.set({
    authToken: session.access_token,
    refreshToken: session.refresh_token,
    user: session.user,
  });
}

export async function clearSessionCache(): Promise<void> {
  await chrome.storage.local.remove(["authToken", "refreshToken", "user"]);
}

// Apply a session received from the web app (web -> extension). Returns true
// when a genuinely new session was applied. Skips no-ops so an echoed session
// can't bounce back and forth between the surfaces.
export async function applySession(tokens: AuthSessionTokens): Promise<boolean> {
  const {
    data: { session: current },
  } = await supabase.auth.getSession();
  if (current?.access_token === tokens.access_token) return false;

  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error || !data.session) return false;

  await persistSessionCache(data.session);
  return true;
}

// Sign out everywhere this extension can reach. Returns true if there was a
// session to clear, so callers can avoid re-broadcasting sign-out loops.
export async function clearSession(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    await clearSessionCache();
    return false;
  }
  await supabase.auth.signOut();
  await clearSessionCache();
  return true;
}

// Push the current session to any open web-app tabs (extension -> web). The
// auth-sync content script relays the message into the page where the web
// AuthSyncProvider applies it to the browser Supabase client.
export async function broadcastSessionToWeb(
  tokens: AuthSessionTokens
): Promise<void> {
  await sendToWebTabs(makeSessionMessage(tokens));
}

export async function broadcastSignOutToWeb(): Promise<void> {
  await sendToWebTabs(makeSignOutMessage());
}

async function sendToWebTabs(message: AuthSyncMessage): Promise<void> {
  if (WEB_APP_TAB_MATCHES.length === 0) return;
  try {
    const tabs = await chrome.tabs.query({ url: WEB_APP_TAB_MATCHES });
    await Promise.all(
      tabs.map((tab) =>
        tab.id != null
          ? // A tab may not have the content script ready yet; ignore failures.
            chrome.tabs.sendMessage(tab.id, message).catch(() => undefined)
          : Promise.resolve()
      )
    );
  } catch {
    // chrome.tabs is unavailable in some contexts (e.g. no tabs permission);
    // sync is best-effort, so swallow.
  }
}
