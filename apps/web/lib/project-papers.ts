import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaperRecommendation } from "@swearch/shared";
import { CONTEXT_LIMITS } from "@swearch/shared/constants/context-limits";

export async function fetchProjectPaperRecommendations(
  supabase: SupabaseClient,
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

export async function removeProjectPaperRecommendation(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("paper_recommendations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
