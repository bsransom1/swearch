/**
 * Lightweight content script injected on all URLs.
 * Responds to SWEARCH_GET_PAGE_METADATA requests from the popup.
 */
import { parsePageMetadata } from "../lib/parse-page-metadata";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "SWEARCH_GET_PAGE_METADATA") return;

  sendResponse(parsePageMetadata(document, window.location.href));
  return true;
});
