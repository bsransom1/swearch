"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/utils";

export default function PapersPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [papers, setPapers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: project }, { data: papersData }] = await Promise.all([
        supabase
          .from("research_projects")
          .select("name")
          .eq("id", projectId)
          .single(),
        supabase
          .from("papers_analyzed")
          .select("*")
          .eq("project_id", projectId)
          .order("last_highlighted_at", { ascending: false }),
      ]);

      if (project) setProjectName(project.name);
      setPapers(papersData || []);
      setLoading(false);
    }
    load();
  }, [projectId]);

  async function loadHighlights(paperId: string) {
    if (highlights[paperId]) {
      setExpandedPaperId(expandedPaperId === paperId ? null : paperId);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("highlights")
      .select("*")
      .eq("paper_id", paperId)
      .order("created_at", { ascending: false });

    setHighlights((prev) => ({ ...prev, [paperId]: data || [] }));
    setExpandedPaperId(paperId);
  }

  const filteredPapers = papers.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.paper_title?.toLowerCase().includes(q) ||
      p.paper_authors?.some((a: string) => a.toLowerCase().includes(q)) ||
      p.paper_url.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-tertiary mb-6">
        <Link href="/projects" className="hover:text-text-secondary">Projects</Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-text-secondary">
          {projectName}
        </Link>
        <span>/</span>
        <span className="text-text-primary">Papers</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Papers</h1>
        <span className="text-text-tertiary text-sm">{papers.length} papers</span>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by title or author..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent mb-6"
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-1 border border-border-subtle rounded-xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : filteredPapers.length > 0 ? (
        <div className="flex flex-col gap-2">
          {filteredPapers.map((paper) => (
            <div key={paper.id} className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden">
              {/* Paper row */}
              <button
                onClick={() => loadHighlights(paper.id)}
                className="w-full text-left p-4 hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <a
                      href={paper.paper_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-medium text-text-primary hover:text-accent transition-colors line-clamp-2 block"
                    >
                      {paper.paper_title || paper.paper_url}
                    </a>
                    {paper.paper_authors && paper.paper_authors.length > 0 && (
                      <p className="text-xs text-text-tertiary mt-1">
                        {paper.paper_authors.slice(0, 3).join(", ")}
                        {paper.paper_year ? ` · ${paper.paper_year}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-text-tertiary mt-1">
                      Last highlighted {formatRelativeDate(paper.last_highlighted_at)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-semibold text-text-primary">
                      {paper.highlight_count}
                    </p>
                    <p className="text-xs text-text-tertiary">highlights</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-xs text-text-tertiary">
                    {expandedPaperId === paper.id ? "▲ Hide" : "▼ Show"} highlights
                  </span>
                </div>
              </button>

              {/* Highlights expansion */}
              {expandedPaperId === paper.id && (
                <div className="border-t border-border-subtle bg-surface-0 px-4 py-3 flex flex-col gap-3">
                  {highlights[paper.id]?.length > 0 ? (
                    highlights[paper.id].map((h) => (
                      <div key={h.id} className="border-l-2 border-border-default pl-3">
                        <p className="text-sm text-text-primary">"{h.highlight_text}"</p>
                        {h.ai_summary && (
                          <p className="text-xs text-text-secondary mt-1">{h.ai_summary}</p>
                        )}
                        {h.ai_relevance && (
                          <p className="text-xs text-indigo-400 mt-1">
                            🎯 {h.ai_relevance}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {h.exported_to_google_doc && (
                            <span className="text-xs text-green-500">✓ Exported</span>
                          )}
                          <span className="text-xs text-text-tertiary">
                            {formatRelativeDate(h.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-text-tertiary">No highlights loaded yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-8 text-center">
          <p className="text-text-secondary text-sm">
            {search ? "No papers match your search." : "No papers yet."}
          </p>
        </div>
      )}
    </div>
  );
}
