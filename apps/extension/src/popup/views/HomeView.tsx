import { useCallback, useEffect, useState } from "react";
import HighlightCard from "../../components/HighlightCard";
import { signOut } from "../../lib/auth";
import { appendBlocksToGoogleDoc, resolveLinkedDocId } from "../../lib/google-docs";
import { fetchProjectGoogleDocs } from "../../lib/project-google-docs";
import { supabase } from "../../lib/supabase";
import { getActiveProjectId } from "../../lib/active-project";
import {
  extractTagsFromSummary,
  formatRelativeTime,
  getWebAppUrl,
} from "../../lib/utils";
import { buildHighlightExportBlocks } from "@swearch/shared/export/highlight-doc-blocks";
import {
  parseHighlightAnalysis,
  type HighlightAnalysis,
} from "@swearch/shared/types/highlight-analysis";

interface Props {
  user: any;
  onSettings: () => void;
}

interface StoredHighlight {
  id: string;
  highlight_text: string;
  ai_summary: string | null;
  ai_methodology: string | null;
  ai_findings: string | null;
  ai_limitations: string | null;
  ai_relevance: string | null;
  ai_sample_size: string | null;
  exported_to_google_doc: boolean | null;
  created_at: string | null;
  papers_analyzed: {
    paper_title: string;
    paper_url: string;
  } | null;
}

function highlightToAnalysis(h: StoredHighlight): HighlightAnalysis {
  const parsed = h.ai_summary ? parseHighlightAnalysis(h.ai_summary) : null;
  return {
    summary: parsed?.summary || h.ai_summary || "",
    methodology: h.ai_methodology ?? parsed?.methodology ?? null,
    findings: h.ai_findings ?? parsed?.findings ?? null,
    limitations: h.ai_limitations ?? parsed?.limitations ?? null,
    relevance: h.ai_relevance ?? parsed?.relevance ?? null,
    sample_size: h.ai_sample_size ?? parsed?.sample_size ?? null,
    tags: parsed?.tags?.length ? parsed.tags : extractTagsFromSummary(h),
  };
}

export default function HomeView({ onSettings }: Props) {
  const [project, setProject] = useState<any>(null);
  const [linkedDocs, setLinkedDocs] = useState<any[]>([]);
  const [exportDocId, setExportDocId] = useState<string | null>(null);
  const [recentHighlights, setRecentHighlights] = useState<StoredHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const projectId = await getActiveProjectId();

    if (!projectId) {
      setProject(null);
      setRecentHighlights([]);
      return;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: projectData }, { data: highlights }, docs] = await Promise.all([
      supabase
        .from("research_projects")
        .select("*, papers_analyzed(count)")
        .eq("id", projectId)
        .single(),
      supabase
        .from("highlights")
        .select("*, papers_analyzed(paper_title, paper_url)")
        .eq("project_id", projectId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10),
      fetchProjectGoogleDocs(projectId),
    ]);

    setProject(projectData);
    setLinkedDocs(docs);
    setExportDocId(docs.find((d) => d.role === "export" || d.role === "both")?.google_doc_id ?? null);
    setRecentHighlights((highlights as StoredHighlight[]) || []);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await loadData();
      setLoading(false);
    }
    load();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleSignOut() {
    await signOut();
    window.location.reload();
  }

  async function handleExportHighlight(highlightId: string) {
    const highlight = recentHighlights.find((h) => h.id === highlightId);
    const docId = exportDocId ?? (await resolveLinkedDocId());
    if (!highlight || !docId) {
      throw new Error("No export doc linked to this project.");
    }

    const analysis = highlightToAnalysis(highlight);
    const blocks = buildHighlightExportBlocks({
      paperTitle: highlight.papers_analyzed?.paper_title || "Unknown paper",
      paperUrl: highlight.papers_analyzed?.paper_url || "",
      highlightText: highlight.highlight_text,
      analysis,
      timestamp: highlight.created_at
        ? new Date(highlight.created_at).toLocaleString()
        : new Date().toLocaleString(),
    });

    await appendBlocksToGoogleDoc(docId, blocks);

    await supabase
      .from("highlights")
      .update({
        exported_to_google_doc: true,
        google_doc_exported_at: new Date().toISOString(),
      })
      .eq("id", highlightId);

    setRecentHighlights((prev) =>
      prev.map((h) =>
        h.id === highlightId ? { ...h, exported_to_google_doc: true } : h
      )
    );
  }

  async function handleCopyHighlight(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function handleDeleteHighlight(highlightId: string) {
    const { error } = await supabase.from("highlights").delete().eq("id", highlightId);
    if (error) throw new Error(error.message);

    setRecentHighlights((prev) => prev.filter((h) => h.id !== highlightId));
  }

  const webAppUrl = getWebAppUrl();

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-semibold text-text-primary">Swearch</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSettings}
            className="text-text-tertiary hover:text-text-secondary text-xs transition-colors"
          >
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="text-text-tertiary hover:text-text-secondary text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="bg-surface-1 border border-border-subtle rounded-lg p-3">
          <p className="text-xs text-text-tertiary mb-1">Active project</p>
          {loading ? (
            <div className="h-4 bg-surface-2 rounded animate-pulse w-32" />
          ) : project ? (
            <>
              <p className="text-sm font-medium text-text-primary">{project.name}</p>
              {linkedDocs.length > 0 && (
                <p className="text-xs text-text-secondary mt-1.5">
                  {linkedDocs.length} linked doc{linkedDocs.length === 1 ? "" : "s"}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-text-secondary">
              No project selected —{" "}
              <button onClick={onSettings} className="text-accent underline">
                set one in Settings
              </button>
            </p>
          )}
        </div>

        <section>
          <div className="flex items-center justify-between mb-2 sticky top-0 bg-surface-0 py-1 z-10">
            <p className="text-xs text-text-tertiary">Recent highlights</p>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="text-xs text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
              aria-label="Refresh highlights"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-surface-1 border border-border-subtle rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : !project ? (
            <p className="text-xs text-text-tertiary text-center py-4">
              Select a project in Settings to see recent highlights.
            </p>
          ) : recentHighlights.length > 0 ? (
            <div className="space-y-2">
              {recentHighlights.map((h) => {
                const analysis = highlightToAnalysis(h);
                return (
                  <HighlightCard
                    key={h.id}
                    id={h.id}
                    highlightText={h.highlight_text}
                    paperTitle={h.papers_analyzed?.paper_title || "Unknown paper"}
                    paperUrl={h.papers_analyzed?.paper_url || ""}
                    tags={analysis.tags}
                    summary={analysis.summary || undefined}
                    relevance={analysis.relevance ?? undefined}
                    methodology={analysis.methodology ?? undefined}
                    findings={analysis.findings ?? undefined}
                    limitations={analysis.limitations ?? undefined}
                    sampleSize={analysis.sample_size ?? undefined}
                    timestamp={
                      h.created_at ? formatRelativeTime(h.created_at) : "Unknown"
                    }
                    isExported={!!h.exported_to_google_doc}
                    linkedDocId={exportDocId ?? undefined}
                    onExport={handleExportHighlight}
                    onCopy={handleCopyHighlight}
                    onDelete={handleDeleteHighlight}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 px-2">
              <p className="text-sm text-text-tertiary">
                No highlights yet. Use the context menu to capture text from research papers.
              </p>
              <a
                href={`${webAppUrl}/dashboard`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-accent hover:underline"
              >
                View all highlights in web app ↗
              </a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
