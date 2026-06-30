import { supabase } from "./supabase";

export interface CachedHighlight {
  id: string;
  ai_summary: string;
  ai_methodology: string | null;
  ai_findings: string | null;
  ai_limitations: string | null;
  ai_relevance: string | null;
  ai_sample_size: string | null;
  created_at: string;
}

export interface HighlightAnalysisResult {
  summary: string;
  methodology: string | null;
  findings: string | null;
  limitations: string | null;
  relevance: string | null;
  sample_size: string | null;
  tags: string[];
}

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

export function cachedToAnalysis(cached: CachedHighlight): HighlightAnalysisResult {
  return {
    summary: cached.ai_summary ?? "",
    methodology: cached.ai_methodology,
    findings: cached.ai_findings,
    limitations: cached.ai_limitations,
    relevance: cached.ai_relevance,
    sample_size: cached.ai_sample_size,
    tags: [],
  };
}

/**
 * Check if we've already analyzed this exact selection recently (within 2 hours).
 */
export async function getCachedAnalysis(
  selectionText: string,
  _paperUrl: string,
  userId: string
): Promise<CachedHighlight | null> {
  try {
    const twoHoursAgo = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    const { data, error } = await supabase
      .from("highlights")
      .select(
        "id, ai_summary, ai_methodology, ai_findings, ai_limitations, ai_relevance, ai_sample_size, created_at"
      )
      .eq("user_id", userId)
      .eq("highlight_text", selectionText)
      .gte("created_at", twoHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("[Swearch] Highlight cache lookup failed:", error.message);
      return null;
    }

    return data as CachedHighlight | null;
  } catch (e) {
    console.error("[Swearch] Cache error:", e);
    return null;
  }
}

/**
 * Returns a cached analysis for the selection, or null if none found recently.
 */
export async function getRecentAnalysisForPaper(
  selectionText: string,
  paperUrl: string,
  userId: string,
  _projectId?: string
): Promise<HighlightAnalysisResult | null> {
  const exactMatch = await getCachedAnalysis(selectionText, paperUrl, userId);
  if (exactMatch) return cachedToAnalysis(exactMatch);
  return null;
}
