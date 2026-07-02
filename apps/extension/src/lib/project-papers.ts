import { supabase } from "./supabase";
import type { PaperRecommendation } from "@swearch/shared";
import type { DiscoveredPaper } from "@swearch/shared/types/discovered-paper";
import { CONTEXT_LIMITS } from "@swearch/shared/constants/context-limits";

export type { PaperRecommendation };

export async function fetchProjectPaperRecommendations(
  projectId: string
): Promise<PaperRecommendation[]> {
  const { data, error } = await supabase
    .from("paper_recommendations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(CONTEXT_LIMITS.maxSavedPapersFetched);

  if (error) throw new Error(error.message);
  return (data as PaperRecommendation[]) ?? [];
}

export async function findSourcePaperId(
  projectId: string,
  pageUrl: string
): Promise<string | null> {
  const { data } = await supabase
    .from("papers_analyzed")
    .select("id")
    .eq("project_id", projectId)
    .eq("paper_url", pageUrl)
    .maybeSingle();

  return data?.id ?? null;
}

export async function addPapersToProject(params: {
  projectId: string;
  userId: string;
  papers: DiscoveredPaper[];
  sourcePaperId?: string | null;
}): Promise<{ added: number; skipped: number }> {
  const { projectId, userId, papers, sourcePaperId } = params;
  let added = 0;
  let skipped = 0;

  for (const paper of papers) {
    const row = {
      project_id: projectId,
      user_id: userId,
      recommended_title: paper.title,
      recommended_url: paper.url,
      recommended_authors: paper.authors,
      recommended_year: paper.year,
      recommended_abstract: paper.abstract,
      relevance_reason: paper.relevanceReason ?? null,
      openalex_work_id: paper.openalexId,
      source_paper_id: sourcePaperId ?? null,
    };

    const { error } = await supabase.from("paper_recommendations").insert(row);

    if (error) {
      if (error.code === "23505") {
        skipped += 1;
        continue;
      }
      throw new Error(error.message);
    }
    added += 1;
  }

  return { added, skipped };
}

export async function removeProjectPaperRecommendation(id: string): Promise<void> {
  const { error } = await supabase.from("paper_recommendations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
