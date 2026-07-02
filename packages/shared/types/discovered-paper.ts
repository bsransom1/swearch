/** Paper returned from find-related-papers edge function (OpenAlex discovery). */
export interface DiscoveredPaper {
  openalexId: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  url: string;
  doi: string | null;
  citationCount: number | null;
  relevanceReason?: string;
}

export interface PageContextPayload {
  url: string;
  title: string | null;
  abstract: string | null;
  doi: string | null;
  conclusion: string | null;
  isLikelyPaper: boolean;
}

export interface FindRelatedPapersResult {
  papers: DiscoveredPaper[];
  searchQuery: string;
}
