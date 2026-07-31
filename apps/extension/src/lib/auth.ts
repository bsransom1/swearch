import { supabase } from "./supabase";
import {
  broadcastSessionToWeb,
  broadcastSignOutToWeb,
  clearSessionCache,
  persistSessionCache,
} from "./auth-sync";
import { clearAllChatHistory } from "./chat-session";
import { SESSION_HIGHLIGHTS_KEY } from "./session-tracking";

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  if (data.session) {
    await persistSessionCache(data.session);
    await broadcastSessionToWeb({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return data.user;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;

  if (data.session) {
    await persistSessionCache(data.session);
    await broadcastSessionToWeb({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return data.user;
}

// Google OAuth for the extension popup.
//
// chrome.identity.launchWebAuthFlow opens Google's consent screen in a managed
// window and returns the final redirect URL once Supabase bounces the user back
// to https://<extension-id>.chromiumapp.org/. We then exchange the authorization
// code for a Supabase session (PKCE; the code_verifier was stored by
// signInWithOAuth in the same popup context).
//
// This uses the Supabase Google provider (the web OAuth client configured in the
// Supabase dashboard), which is separate from the manifest oauth2 client used by
// chrome.identity.getAuthToken for Drive/Docs access.
export async function signInWithGoogle() {
  const redirectTo = chrome.identity.getRedirectURL();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Could not start Google sign-in");

  const redirectUrl = await launchWebAuthFlow(data.url);

  const code = new URL(redirectUrl).searchParams.get("code");
  if (!code) {
    const description =
      new URL(redirectUrl).searchParams.get("error_description") ||
      "No authorization code returned from Google";
    throw new Error(description);
  }

  const { data: exchange, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;

  if (exchange.session) {
    await persistSessionCache(exchange.session);
    await broadcastSessionToWeb({
      access_token: exchange.session.access_token,
      refresh_token: exchange.session.refresh_token,
    });
  }

  return exchange.user;
}

function launchWebAuthFlow(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        reject(
          new Error(
            chrome.runtime.lastError?.message || "Google sign-in was cancelled"
          )
        );
        return;
      }
      resolve(responseUrl);
    });
  });
}

// Supabase is the single source of truth. chrome.storage.local is a cache only.
//
// Resolution order:
// 1. If chrome.storage.local has a cached token, set it on the Supabase client.
// 2. Call supabase.auth.getUser() to verify with the Supabase server regardless.
//    - If valid: sync the fresh session back to chrome.storage.local and return true.
//    - If invalid: clear chrome.storage.local and return false.
// 3. If chrome.storage.local has no token, supabase.auth.getUser() still runs —
//    Supabase may have a persisted session (e.g. synced from the web app) stored
//    via the chromeStorageAdapter under its own key.
export async function restoreSession(): Promise<boolean> {
  const cached = await new Promise<{ authToken?: string; refreshToken?: string }>(
    (resolve) => chrome.storage.local.get(["authToken", "refreshToken"], resolve)
  );

  // Seed the Supabase client with the cached token so getUser() doesn't need
  // to do a full OAuth exchange. If invalid, Supabase will return an error.
  if (cached.authToken && cached.refreshToken) {
    await supabase.auth.setSession({
      access_token: cached.authToken,
      refresh_token: cached.refreshToken,
    });
  }

  // Verify with Supabase — this is the authoritative check
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Clear stale cache — the session is gone on the server
    await clearSessionCache();
    return false;
  }

  // Sync the freshest session back to chrome.storage.local
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await persistSessionCache(session);
  }

  return true;
}

export async function signOut() {
  // Destroy the session on Supabase's server — this invalidates the session for
  // both the extension and the web app since they share the same Supabase project.
  await supabase.auth.signOut();
  // Clear the local cache and tell any open web tabs to sign out too.
  await clearSessionCache();
  // Chat history and session highlights outlive chrome.storage.local, so they
  // must be cleared explicitly or the next account to sign in would see them.
  await clearAllChatHistory();
  await chrome.storage.session.remove([SESSION_HIGHLIGHTS_KEY]);
  await broadcastSignOutToWeb();
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
