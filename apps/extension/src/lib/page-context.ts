export interface PageMetadata {
  isLikelyPaper: boolean;
  paperTitle: string | null;
  paperAbstract: string | null;
  paperDoi: string | null;
  paperUrl: string;
}

/**
 * Query the active tab's content script for paper metadata.
 * Returns null if the content script is unavailable or the tab is not a paper.
 */
export async function getCurrentPageMetadata(): Promise<PageMetadata | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        resolve(null);
        return;
      }

      chrome.tabs.sendMessage(
        tabId,
        { type: "SWEARCH_GET_PAGE_METADATA" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve(null);
            return;
          }
          resolve(response as PageMetadata);
        }
      );
    });
  });
}
