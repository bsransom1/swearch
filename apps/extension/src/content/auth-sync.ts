// Auth-sync content script. Runs only on web-app origins (see manifest matches).
//
// It bridges the extension -> web direction of the auth sync: the service worker
// can't postMessage into a page directly, so it sends messages to this content
// script (via chrome.tabs.sendMessage), which relays them into the page where
// the web AuthSyncProvider applies them to the browser Supabase client.
//
// The web -> extension direction does NOT go through here: the page talks to the
// extension directly via chrome.runtime.sendMessage(EXTENSION_ID) thanks to
// externally_connectable. Keeping this script one-directional avoids message loops.
import {
  isAuthSyncMessage,
  makeRequestSessionMessage,
} from "@swearch/shared/constants/auth-sync";

// Relay messages pushed by the service worker into the page.
chrome.runtime.onMessage.addListener((message) => {
  if (isAuthSyncMessage(message)) {
    window.postMessage(message, window.location.origin);
  }
});

// On load, ask the extension whether it already holds a session and, if so,
// push it into this page so a logged-in extension hydrates a fresh web tab.
chrome.runtime.sendMessage(makeRequestSessionMessage(), (response) => {
  if (chrome.runtime.lastError) return;
  if (isAuthSyncMessage(response)) {
    window.postMessage(response, window.location.origin);
  }
});
