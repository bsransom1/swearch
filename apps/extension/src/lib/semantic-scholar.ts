import type { HighlightAnalysis } from "@swearch/shared/types/highlight-analysis";

const API_BASE = "https://api.semanticscholar.org/graph/v1";

export interface PaperRecommendation {
  paperId: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  url: string;
  citationCount: number;
}

// TODO: Add retry logic for Semantic Scholar rate limits (429 response)
// Implement exponential backoff: wait 1s, 2s, 4s before giving up.
// Also consider adding x-api-key header if registered for higher rate limits.
export async function findRelatedPapers(
  query: string,
  limit = 3
): Promise<PaperRecommendation[]> {
  const response = await fetch(
    `${API_BASE}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=paperId,title,authors,year,abstract,externalIds,citationCount`,
    {
      headers: {
        "Content-Type": "application/json",
        // TODO: Add x-api-key header if you register for Semantic Scholar API key (optional but increases rate limit)
      },
    }
  );

  if (response.status === 429) {
    // Rate limited — return empty rather than crash
    console.warn("Semantic Scholar rate limit hit");
    return [];
  }

  if (!response.ok) {
    throw new Error(`Semantic Scholar API error: ${response.statusText}`);
  }

  const data = await response.json();

  return (data.data || []).map((paper: any): PaperRecommendation => ({
    paperId: paper.paperId,
    title: paper.title,
    authors: paper.authors?.map((a: any) => a.name) || [],
    year: paper.year,
    abstract: paper.abstract,
    url: paper.externalIds?.DOI
      ? `https://doi.org/${paper.externalIds.DOI}`
      : `https://www.semanticscholar.org/paper/${paper.paperId}`,
    citationCount: paper.citationCount || 0,
  }));
}

export function buildSearchQueryFromAnalysis(
  analysis: HighlightAnalysis,
  paperTitle: string
): string {
  const queryParts = [
    ...analysis.tags.slice(0, 2),
    analysis.findings?.split(".")[0] || "",
  ].filter(Boolean);

  // Semantic Scholar performs better with shorter, focused queries
  return queryParts.join(" ").slice(0, 100);
}
