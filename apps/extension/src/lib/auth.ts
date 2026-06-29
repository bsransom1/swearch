import { supabase } from "./supabase";

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  if (data.session) {
    await chrome.storage.local.set({
      authToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
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
    await chrome.storage.local.set({
      authToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
    });
  }

  return data.user;
}

// TODO: Implement Google OAuth for extension using chrome.identity.launchWebAuthFlow
// Reference: https://developer.chrome.com/docs/extensions/reference/identity/
// Flow: generate PKCE code_verifier + code_challenge, open Google OAuth URL via
// chrome.identity.launchWebAuthFlow, exchange code for tokens via Supabase auth endpoint.
export async function signInWithGoogle(): Promise<never> {
  throw new Error("Google OAuth not yet implemented for extension");
}

export async function restoreSession(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["authToken", "refreshToken"], async (result) => {
      if (!result.authToken) {
        resolve(false);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: result.authToken,
        refresh_token: result.refreshToken,
      });

      if (error) {
        // Token likely expired — clear storage
        await chrome.storage.local.remove(["authToken", "refreshToken", "user"]);
        resolve(false);
        return;
      }

      // TODO: Refresh token when access token expires (check expiry before API calls)
      // Parse JWT exp claim and proactively refresh if within 60s of expiry

      resolve(true);
    });
  });
}

export async function signOut() {
  await supabase.auth.signOut();
  await chrome.storage.local.clear();
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
