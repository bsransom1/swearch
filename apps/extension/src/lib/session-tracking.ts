const SESSION_HIGHLIGHTS_KEY = "swearchSessionHighlightIds";

/**
 * Record a highlight ID in session storage so the Session Activity tab can
 * fetch and display highlights captured during the current browser session.
 * Data is cleared automatically when the browser restarts (session storage).
 */
export async function trackHighlightInSession(highlightId: string): Promise<void> {
  try {
    const result = await chrome.storage.session.get([SESSION_HIGHLIGHTS_KEY]);
    const existing: string[] = result[SESSION_HIGHLIGHTS_KEY] || [];
    // Deduplicate
    if (!existing.includes(highlightId)) {
      await chrome.storage.session.set({
        [SESSION_HIGHLIGHTS_KEY]: [...existing, highlightId],
      });
    }
  } catch (e) {
    console.warn("[Swearch] Failed to track highlight in session:", e);
  }
}

/**
 * Return the list of highlight IDs captured during the current browser session.
 */
export async function getSessionHighlightIds(): Promise<string[]> {
  try {
    const result = await chrome.storage.session.get([SESSION_HIGHLIGHTS_KEY]);
    return result[SESSION_HIGHLIGHTS_KEY] || [];
  } catch {
    return [];
  }
}
