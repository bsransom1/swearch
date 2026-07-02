import { supabase } from "./supabase";
import {
  buildProjectContextBundle as buildBundle,
  type ContextTask,
  type ProjectContextBundle,
} from "@swearch/shared/types/project-chat-context";
import type { ProjectGoogleDoc } from "@swearch/shared/types/project-google-doc";
import { CONTEXT_LIMITS } from "@swearch/shared/constants/context-limits";

export type { ContextTask, ProjectContextBundle };

interface HighlightRow {
  highlight_text: string;
  ai_summary: string | null;
  papers_analyzed: { paper_title: string | null } | null;
}

export async function buildProjectContextBundle(
  projectId: string,
  task: ContextTask
): Promise<ProjectContextBundle | null> {
  try {
    const [projectResult, docsResult, highlightsResult, papersResult] = await Promise.all([
      supabase
        .from("research_projects")
        .select("id, name, description")
        .eq("id", projectId)
        .single(),
      supabase
        .from("project_google_docs")
        .select("id, project_id, user_id, google_doc_id, title, cached_text, cached_at, summary, summary_at, role, sort_order, created_at, updated_at")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("highlights")
        .select("highlight_text, ai_summary, papers_analyzed(paper_title)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(CONTEXT_LIMITS.maxHighlightsFetched),
      supabase
        .from("paper_recommendations")
        .select(
          "recommended_title, recommended_authors, recommended_year, recommended_abstract, relevance_reason, recommended_url"
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(CONTEXT_LIMITS.maxSavedPapersFetched),
    ]);

    if (projectResult.error || !projectResult.data) return null;

    if (papersResult.error) {
      console.warn("[Swearch] Failed to load paper recommendations:", papersResult.error.message);
    }

    const project = projectResult.data as { id: string; name: string; description: string | null };
    const docs = (docsResult.data ?? []) as ProjectGoogleDoc[];
    const highlights = ((highlightsResult.data ?? []) as HighlightRow[]).map((h) => ({
      highlight_text: h.highlight_text,
      ai_summary: h.ai_summary,
      paperTitle: h.papers_analyzed?.paper_title ?? null,
    }));

    return buildBundle(
      project,
      docs,
      highlights,
      task,
      (papersResult.data ?? []) as {
        recommended_title: string;
        recommended_authors: string[] | null;
        recommended_year: number | null;
        recommended_abstract: string | null;
        relevance_reason: string | null;
        recommended_url: string | null;
      }[]
    );
  } catch (e) {
    console.warn("[Swearch] buildProjectContextBundle failed:", e);
    return null;
  }
}
