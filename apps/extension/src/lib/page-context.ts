import {
  canRecommendRelatedPapers,
  metadataFromTabUrl,
  parsePageMetadata,
  type ParsedPageMetadata,
} from "./parse-page-metadata";

export type PageMetadata = ParsedPageMetadata;

export { canRecommendRelatedPapers, isPaperLikeUrl } from "./parse-page-metadata";

const PAGE_METADATA_SCRIPT = "content/page-metadata.js";

function queryActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function sendMetadataRequest(tabId: number): Promise<PageMetadata | null> {
  return new Promise((resolve) => {
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
}

async function injectMetadataScript(tabId: number): Promise<PageMetadata | null> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      files: [PAGE_METADATA_SCRIPT],
    });
  } catch {
    // Restricted pages (chrome://, Web Store, etc.)
  }

  return sendMetadataRequest(tabId);
}

async function parseViaInjection(tabId: number, url: string): Promise<PageMetadata | null> {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: (pageUrl: string) => {
        const title =
          document.querySelector('meta[name="citation_title"]')?.getAttribute("content") ||
          document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
          document.querySelector("h1")?.textContent?.trim() ||
          document.title?.replace(/ [-|–—] .*$/, "").trim() ||
          null;
        const abstract =
          document.querySelector('meta[name="citation_abstract"]')?.getAttribute("content") ||
          document.querySelector("#abstract")?.textContent?.trim()?.slice(0, 1000) ||
          null;
        const doi =
          document.querySelector('meta[name="citation_doi"]')?.getAttribute("content") ||
          pageUrl.match(/10\.\d{4,9}\/[^\s"<>]+/)?.[0] ||
          null;
        const paperLike =
          /arxiv\.org|pubmed\.ncbi|doi\.org\/10\.|nature\.com\/articles|sciencedirect\.com\/science\/article/i.test(
            pageUrl
          );
        return {
          isLikelyPaper: !!(doi || (paperLike && title) || (title && abstract)),
          paperTitle: title,
          paperAbstract: abstract,
          paperDoi: doi,
          paperUrl: pageUrl,
          paperConclusion: null,
        };
      },
      args: [url],
    });
    return (result as PageMetadata) ?? null;
  } catch {
    return null;
  }
}

function mergeWithTabFallback(
  metadata: PageMetadata | null,
  tab: chrome.tabs.Tab
): PageMetadata | null {
  const url = tab.url;
  if (!url) return metadata;

  if (metadata && canRecommendRelatedPapers(metadata)) {
    return metadata;
  }

  const fallback = metadataFromTabUrl(url, tab.title);
  if (!metadata) return fallback;

  // Prefer DOM parse for title/abstract; use tab URL heuristics to enable discovery.
  return {
    ...metadata,
    paperUrl: metadata.paperUrl || url,
    paperTitle: metadata.paperTitle || fallback.paperTitle,
    paperDoi: metadata.paperDoi || fallback.paperDoi,
    isLikelyPaper: metadata.isLikelyPaper || fallback.isLikelyPaper,
  };
}

/**
 * Query the active tab for paper metadata. Injects a content script if needed
 * (e.g. page loaded before the extension was enabled).
 */
export async function getCurrentPageMetadata(): Promise<PageMetadata | null> {
  const tab = await queryActiveTab();
  const tabId = tab?.id;
  const url = tab?.url;

  if (!tabId || !url) return null;

  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    return null;
  }

  let metadata = await sendMetadataRequest(tabId);

  if (!metadata) {
    metadata = await injectMetadataScript(tabId);
  }

  if (!metadata) {
    metadata = await parseViaInjection(tabId, url);
  }

  return mergeWithTabFallback(metadata, tab);
}

/** Used by tests and direct document parsing. */
export { parsePageMetadata };
