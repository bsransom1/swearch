// Detects text highlights on any research paper page.
// Sends selected text to background service worker via chrome.runtime.

let selectionTimeout: ReturnType<typeof setTimeout> | null = null;

document.addEventListener("mouseup", () => {
  if (selectionTimeout) clearTimeout(selectionTimeout);

  selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selectedText || selectedText.length < 20) return;

    const paperTitle =
      document.querySelector("h1")?.textContent?.trim() ||
      document.title ||
      "";

    const paperUrl = window.location.href;

    // Attempt to extract DOI from meta tags or URL
    const doiMatch =
      document.querySelector('[data-doi]')?.getAttribute("data-doi") ||
      document.querySelector('meta[name="citation_doi"]')?.getAttribute("content") ||
      paperUrl.match(/10\.\d{4,9}\/[^\s"<>]+/)?.[0] ||
      null;

    chrome.runtime.sendMessage({
      type: "HIGHLIGHT_CAPTURED",
      payload: {
        selectedText,
        paperTitle,
        paperUrl,
        paperDoi: doiMatch,
        timestamp: new Date().toISOString(),
      },
    });
  }, 300);
});
