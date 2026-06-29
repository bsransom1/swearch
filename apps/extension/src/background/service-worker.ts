import { storage } from "../lib/storage";
import { restoreSession } from "../lib/auth";

// TODO: Add session refresh listener in service worker
// Listen for supabase TOKEN_REFRESHED events and update chrome.storage.local
// with new access_token + refresh_token to keep session alive across browser restarts.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "HIGHLIGHT_CAPTURED") {
    storage
      .set({ pendingHighlight: message.payload })
      .then(() => {
        chrome.action.setBadgeText({ text: "1" });
        chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
        sendResponse({ ok: true });
      })
      .catch((err) => {
        console.error("Failed to store highlight:", err);
        sendResponse({ ok: false, error: err.message });
      });

    // Return true to keep message channel open for async sendResponse
    return true;
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await restoreSession();
});

chrome.runtime.onInstalled.addListener(async () => {
  await restoreSession();
});
