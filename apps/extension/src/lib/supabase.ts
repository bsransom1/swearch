import { createClient } from "@supabase/supabase-js";
import type { Database } from "@swearch/shared/types/database";

// Custom storage adapter that uses chrome.storage.local instead of localStorage.
// localStorage doesn't exist in the extension service worker context, so without
// this adapter, Supabase silently fails to persist sessions there.
const chromeStorageAdapter = {
  getItem: (key: string): Promise<string | null> =>
    new Promise((resolve) =>
      chrome.storage.local.get(key, (result) => resolve(result[key] ?? null))
    ),
  setItem: (key: string, value: string): Promise<void> =>
    new Promise((resolve) =>
      chrome.storage.local.set({ [key]: value }, resolve)
    ),
  removeItem: (key: string): Promise<void> =>
    new Promise((resolve) =>
      chrome.storage.local.remove(key, resolve)
    ),
};

// Anon key is safe to bundle in the extension — Supabase RLS enforces data access
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // PKCE is required so the popup can exchange the authorization code
      // returned by chrome.identity.launchWebAuthFlow for a session. The
      // code_verifier is stashed in chrome.storage by signInWithOAuth and read
      // back by exchangeCodeForSession within the same popup context.
      flowType: "pkce",
    },
  }
);
