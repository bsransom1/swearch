import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProjectDetailClient from "@/components/project/project-detail-client";
import type { ProjectGoogleDoc } from "@swearch/shared/types/project-google-doc";
import type { PaperRecommendation } from "@swearch/shared";
import type { ProjectHighlightRow } from "@/components/project/project-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("research_projects")
    .select("id, name, description, updated_at")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!project) notFound();

  const [
    { data: papers },
    { data: linkedDocs },
    { data: highlights },
    { data: savedPapers },
  ] = await Promise.all([
    supabase
      .from("papers_analyzed")
      .select("id, paper_title, paper_url, highlight_count, last_highlighted_at")
      .eq("project_id", id)
      .order("last_highlighted_at", { ascending: false }),
    supabase
      .from("project_google_docs")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("highlights")
      .select(
        `
        id,
        highlight_text,
        ai_summary,
        ai_methodology,
        ai_findings,
        ai_limitations,
        ai_relevance,
        ai_sample_size,
        created_at,
        user_note,
        exported_to_google_doc,
        google_doc_exported_at,
        paper_id,
        papers_analyzed ( id, paper_title, paper_url )
      `
      )
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("paper_recommendations")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const normalizedHighlights: ProjectHighlightRow[] = (highlights ?? []).map((row) => {
    const paper = Array.isArray(row.papers_analyzed)
      ? row.papers_analyzed[0]
      : row.papers_analyzed;
    return {
      ...row,
      papers_analyzed: paper ?? null,
    };
  });

  return (
    <ProjectDetailClient
      project={project}
      initialHighlights={normalizedHighlights}
      initialPapers={papers ?? []}
      initialDocs={(linkedDocs as ProjectGoogleDoc[]) ?? []}
      initialSavedPapers={(savedPapers as PaperRecommendation[]) ?? []}
    />
  );
}
