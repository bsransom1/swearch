export interface ParsedPageMetadata {
  isLikelyPaper: boolean;
  paperTitle: string | null;
  paperAbstract: string | null;
  paperDoi: string | null;
  paperUrl: string;
  paperConclusion: string | null;
}

/** Host/path patterns common on scholarly article pages. */
const PAPER_URL_PATTERNS: RegExp[] = [
  /arxiv\.org\/(abs|pdf|html)\//i,
  /pubmed\.ncbi\.nlm\.nih\.gov\/\d+/i,
  /ncbi\.nlm\.nih\.gov\/pmc\/articles\/PMC/i,
  /doi\.org\/10\./i,
  /sciencedirect\.com\/science\/article/i,
  /nature\.com\/articles\//i,
  /springer\.com\/(article|chapter)\//i,
  /link\.springer\.com\/(article|chapter)\//i,
  /bmj\.com\/content\//i,
  /jstor\.org\/(stable|doi)\//i,
  /biomedcentral\.com\/articles\//i,
  /plos\.org\/.*\/article/i,
  /frontiersin\.org\/articles\//i,
  /mdpi\.com\/\d+\/\d+\/\d+/i,
  /academic\.oup\.com\//i,
  /ieeexplore\.ieee\.org\/document\//i,
  /dl\.acm\.org\/doi\//i,
  /biorxiv\.org\/content\//i,
  /medrxiv\.org\/content\//i,
  /researchgate\.net\/publication\//i,
  /semanticscholar\.org\/paper\//i,
  /onlinelibrary\.wiley\.com\/doi\//i,
  /tandfonline\.com\/doi\//i,
  /cell\.com\/.*\/(fulltext|abstract)/i,
  /thelancet\.com\/journals\/.+\/article/i,
  /jamanetwork\.com\/journals\//i,
  /ahajournals\.org\/doi\//i,
  /cambridge\.org\/core\/journals\/.+\/article/i,
  /sagepub\.com\/doi\//i,
  /karger\.com\/Article\//i,
  /embopress\.org\/doi\//i,
  /science\.org\/doi\//i,
  /pnas\.org\/doi\//i,
  /acs\.org\/doi\//i,
  /rsc\.org\/.*\/articlelanding/i,
  /hindawi\.com\/journals\/.+\/articles\//i,
  /europepmc\.org\/article\//i,
];

const DOI_IN_URL = /10\.\d{4,9}\/[^\s"'<>?#]+/;

export function isPaperLikeUrl(url: string): boolean {
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    return false;
  }
  if (DOI_IN_URL.test(url)) return true;
  return PAPER_URL_PATTERNS.some((pattern) => pattern.test(url));
}

export function extractDoiFromUrl(url: string): string | null {
  const match = url.match(DOI_IN_URL);
  return match?.[0]?.replace(/[.,;)\]]+$/, "") ?? null;
}

function metaContent(doc: Document, selector: string): string | null {
  const el = doc.querySelector(selector);
  const content = el?.getAttribute("content")?.trim();
  return content || null;
}

function firstText(doc: Document, selectors: string[], maxLen = 2000): string | null {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    const text = el?.textContent?.replace(/\s+/g, " ").trim();
    if (text && text.length > 20) {
      return text.slice(0, maxLen);
    }
  }
  return null;
}

function extractTitle(doc: Document): string | null {
  const fromMeta =
    metaContent(doc, 'meta[name="citation_title"]') ||
    metaContent(doc, 'meta[name="DC.title"]') ||
    metaContent(doc, 'meta[name="dc.title"]') ||
    metaContent(doc, 'meta[property="og:title"]') ||
    metaContent(doc, 'meta[name="twitter:title"]') ||
    metaContent(doc, 'meta[property="article:title"]');

  if (fromMeta) return fromMeta;

  const fromDom =
    doc.querySelector("h1[data-test='article-title']")?.textContent?.trim() ||
    doc.querySelector("h1.title")?.textContent?.trim() ||
    doc.querySelector("h1[data-article-title]")?.textContent?.trim() ||
    doc.querySelector("h1.c-article-title")?.textContent?.trim() ||
    doc.querySelector("[class*='article-title'] h1")?.textContent?.trim() ||
    doc.querySelector("h1")?.textContent?.trim() ||
    null;

  if (fromDom) return fromDom;

  const fromTitle = doc.title?.replace(/ [-|–—] .*$/, "").trim();
  return fromTitle || null;
}

function extractAbstract(doc: Document): string | null {
  const fromMeta =
    metaContent(doc, 'meta[name="citation_abstract"]') ||
    metaContent(doc, 'meta[name="description"]') ||
    metaContent(doc, 'meta[name="DC.description"]') ||
    metaContent(doc, 'meta[property="og:description"]') ||
    metaContent(doc, 'meta[name="twitter:description"]');

  if (fromMeta && fromMeta.length > 40) return fromMeta.slice(0, 2000);

  return firstText(doc, [
    "#abstract",
    "[id*='abstract']",
    "[data-section='abstract']",
    "section[aria-labelledby*='abstract']",
    ".abstract-content",
    ".article-section__abstract",
    "[class*='Abstracts']",
    "[class*='abstract'] p",
    "div.abstract",
  ]);
}

function extractDoi(doc: Document, url: string): string | null {
  return (
    doc.querySelector("[data-doi]")?.getAttribute("data-doi")?.trim() ||
    metaContent(doc, 'meta[name="citation_doi"]') ||
    metaContent(doc, 'meta[name="DC.identifier"]')?.match(DOI_IN_URL)?.[0] ||
    metaContent(doc, 'meta[name="doi"]') ||
    extractDoiFromUrl(url)
  );
}

function extractConclusion(doc: Document): string | null {
  return firstText(
    doc,
    [
      "#conclusion",
      "[id*='conclusion']",
      "[data-section='conclusion']",
      "section[aria-labelledby*='conclusion']",
      "[class*='Conclusion']",
      "h2#conclusions ~ p",
      "h3#conclusions ~ p",
    ],
    800
  );
}

function hasCitationSignals(doc: Document): boolean {
  return !!(
    doc.querySelector('meta[name="citation_author"]') ||
    doc.querySelector('meta[name="citation_journal_title"]') ||
    doc.querySelector('meta[name="citation_publication_date"]') ||
    doc.querySelector('meta[name="citation_pdf_url"]') ||
    doc.querySelector('link[rel="canonical"][href*="doi.org"]')
  );
}

export function parsePageMetadata(doc: Document, url: string): ParsedPageMetadata {
  const paperTitle = extractTitle(doc);
  const paperAbstract = extractAbstract(doc);
  const paperDoi = extractDoi(doc, url);
  const paperConclusion = extractConclusion(doc);
  const paperUrl = url;
  const paperLikeUrl = isPaperLikeUrl(url);
  const citationSignals = hasCitationSignals(doc);

  const isLikelyPaper = !!(
    paperDoi ||
    (paperLikeUrl && paperTitle) ||
    (citationSignals && paperTitle) ||
    (paperTitle && paperAbstract && paperAbstract.length > 40)
  );

  return {
    isLikelyPaper,
    paperTitle,
    paperAbstract,
    paperDoi,
    paperUrl,
    paperConclusion,
  };
}

export function metadataFromTabUrl(
  url: string,
  tabTitle?: string | null
): ParsedPageMetadata {
  const paperTitle = tabTitle?.replace(/ [-|–—] .*$/, "").trim() || null;
  const paperDoi = extractDoiFromUrl(url);
  const paperLikeUrl = isPaperLikeUrl(url);

  return {
    isLikelyPaper: !!(paperDoi || (paperLikeUrl && paperTitle)),
    paperTitle,
    paperAbstract: null,
    paperDoi,
    paperUrl: url,
    paperConclusion: null,
  };
}

/** Whether the brain icon / related-papers flow should be available. */
export function canRecommendRelatedPapers(meta: ParsedPageMetadata | null): boolean {
  if (!meta) return false;
  return meta.isLikelyPaper;
}

export function buildRelatedPapersQuery(
  title: string,
  abstract: string | null,
  conclusion: string | null
): string {
  const trimmed = title.trim();
  if (!trimmed) return "";

  const context =
    abstract?.trim().slice(0, 200) ||
    conclusion?.trim().slice(0, 200) ||
    "";

  return context ? `${trimmed} ${context}` : trimmed;
}
