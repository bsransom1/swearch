import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("research_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!project) notFound();

  const { data: papers } = await supabase
    .from("papers_analyzed")
    .select("*")
    .eq("project_id", id)
    .order("last_highlighted_at", { ascending: false });

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-tertiary mb-6">
        <Link href="/projects" className="hover:text-text-secondary">Projects</Link>
        <span>/</span>
        <span className="text-text-primary">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{project.name}</h1>
            {project.description && (
              <p className="text-text-secondary text-sm mt-1">{project.description}</p>
            )}
            {project.google_doc_title && (
              <a
                href={`https://docs.google.com/document/d/${project.google_doc_id}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline mt-2 inline-block"
              >
                📄 {project.google_doc_title} →
              </a>
            )}
          </div>
          <Link
            href={`/projects/${id}/papers`}
            className="text-sm text-accent hover:underline"
          >
            View all papers →
          </Link>
        </div>
      </div>

      {/* Papers summary */}
      <section>
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
          Papers ({papers?.length ?? 0})
        </h2>
        {papers && papers.length > 0 ? (
          <div className="flex flex-col gap-2">
            {papers.slice(0, 10).map((paper) => (
              <div
                key={paper.id}
                className="bg-surface-1 border border-border-subtle rounded-xl p-4 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={paper.paper_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-text-primary hover:text-accent transition-colors line-clamp-1"
                  >
                    {paper.paper_title || paper.paper_url}
                  </a>
                  {paper.paper_authors && paper.paper_authors.length > 0 && (
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {paper.paper_authors.slice(0, 3).join(", ")}
                      {paper.paper_year ? ` · ${paper.paper_year}` : ""}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-semibold text-text-primary">
                    {paper.highlight_count}
                  </p>
                  <p className="text-xs text-text-tertiary">highlights</p>
                </div>
              </div>
            ))}
            {papers.length > 10 && (
              <Link
                href={`/projects/${id}/papers`}
                className="text-sm text-accent hover:underline text-center py-2"
              >
                View all {papers.length} papers →
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-8 text-center">
            <p className="text-text-secondary text-sm">No papers analyzed yet.</p>
            <p className="text-text-tertiary text-xs mt-1">
              Highlight text on research papers using the Chrome extension.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
