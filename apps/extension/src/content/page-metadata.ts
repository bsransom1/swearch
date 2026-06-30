/**
 * Lightweight content script injected on all URLs.
 * Responds to SWEARCH_GET_PAGE_METADATA requests from the popup
 * so it can show the "Find related papers" banner when on a research paper.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SWEARCH_GET_PAGE_METADATA") return;

  const paperTitle =
    document.querySelector('meta[name="citation_title"]')?.getAttribute("content") ||
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    document.querySelector("h1.title")?.textContent?.trim() ||
    document.querySelector("h1[data-article-title]")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title?.replace(/ [-|–] .*$/, "").trim() ||
    null;

  const paperAbstract =
    document.querySelector('meta[name="citation_abstract"]')?.getAttribute("content") ||
    document.querySelector("[class*='abstract']")?.textContent?.trim()?.slice(0, 1000) ||
    document.querySelector("#abstract")?.textContent?.trim()?.slice(0, 1000) ||
    null;

  const paperDoi =
    document.querySelector("[data-doi]")?.getAttribute("data-doi") ||
    document.querySelector('meta[name="citation_doi"]')?.getAttribute("content") ||
    window.location.href.match(/10\.\d{4,9}\/[^\s"<>]+/)?.[0] ||
    null;

  const isLikelyPaper = !!(paperTitle && (paperAbstract || paperDoi));

  sendResponse({
    isLikelyPaper,
    paperTitle,
    paperAbstract,
    paperDoi,
    paperUrl: window.location.href,
  });

  return true;
});
