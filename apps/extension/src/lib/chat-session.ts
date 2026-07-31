/** Session-scoped chat persistence keys, shared by ChatView and Settings. */

export const CHAT_SESSION_KEY_PREFIX = "swearchChatHistory:";

/** Legacy single-key storage from before per-project scoping. */
export const LEGACY_CHAT_SESSION_KEY = "swearchChatHistory";

export function chatStorageKey(projectId: string | null | undefined): string {
  return `${CHAT_SESSION_KEY_PREFIX}${projectId ?? "none"}`;
}

/** Clears every project's chat history, not just the active project's. */
export async function clearAllChatHistory(): Promise<void> {
  const all = await chrome.storage.session.get(null);
  const keys = Object.keys(all).filter(
    (key) => key === LEGACY_CHAT_SESSION_KEY || key.startsWith(CHAT_SESSION_KEY_PREFIX)
  );
  if (keys.length === 0) return;
  await chrome.storage.session.remove(keys);
}
