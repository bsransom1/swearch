"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ExternalLink, Search, X } from "lucide-react";
import type { PaperRecommendation } from "@swearch/shared";
import {
  inferHighlightType,
  parseHighlightAnalysis,
  resolveProjectHighlightInsight,
  type HighlightDisplayType,
} from "@swearch/shared/types/highlight-analysis";
import { toHighlightExportInput } from "@swearch/shared/export/highlight-doc-blocks";
import { findExportDoc, type ProjectGoogleDoc } from "@swearch/shared/types/project-google-doc";
import { INPUT_FIELD } from "@swearch/shared/theme";
import LinkedDocumentsManager from "@/components/projects/linked-documents-manager";
import LinkedProjectPaperCard from "@/components/project/linked-project-paper-card";
import HighlightIndexRow from "@/components/project/highlight-index-row";
import HighlightDetailPanel from "@/components/project/highlight-detail-panel";
import ProjectOverview from "@/components/project/project-overview";
import { createClient } from "@/lib/supabase/client";
import { appendHighlightExportToGoogleDoc, getGoogleAccessToken } from "@/lib/google-docs";
import { removeProjectPaperRecommendation } from "@/lib/project-papers";
import { formatDate, formatRelativeDate } from "@/lib/utils";

export interface ProjectHighlightRow {
  id: string;
  highlight_text: string;
  ai_summary: string | null;
  ai_methodology: string | null;
  ai_findings: string | null;
  ai_limitations: string | null;
  ai_relevance: string | null;
  ai_sample_size: string | null;
  created_at: string | null;
  user_note: string | null;
  exported_to_google_doc: boolean | null;
  google_doc_exported_at: string | null;
  paper_id: string;
  papers_analyzed: {
    id: string;
    paper_title: string;
    paper_url: string;
  } | null;
}

interface PaperRow {
  id: string;
  paper_title: string | null;
  paper_url: string;
  highlight_count: number;
  last_highlighted_at: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  updated_at: string | null;
}

type ViewMode = "by-paper" | "all" | "by-type";
type TypeFilter = "all" | HighlightDisplayType;
type DateFilter = "all" | "7d" | "30d" | "90d";

interface Props {
  project: ProjectRow;
  initialHighlights: ProjectHighlightRow[];
  initialPapers: PaperRow[];
  initialDocs: ProjectGoogleDoc[];
  initialSavedPapers: PaperRecommendation[];
}

function highlightMatchesSearch(h: ProjectHighlightRow, q: string): boolean {
  const fields = [
    h.highlight_text,
    h.user_note,
    h.ai_summary,
    h.ai_findings,
    h.ai_methodology,
    h.ai_limitations,
    h.ai_relevance,
    h.ai_sample_size,
    h.papers_analyzed?.paper_title,
  ];
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function highlightMatchesDate(h: ProjectHighlightRow, filter: DateFilter): boolean {
  if (filter === "all" || !h.created_at) return true;
  const days = filter === "7d" ? 7 : filter === "30d" ? 30 : 90;
  return new Date(h.created_at).getTime() >= Date.now() - days * 86400000;
}

/** Compute smart expand defaults: ≤3 papers → all; else → most recently active. */
function computeSmartExpand(
  filteredHighlights: ProjectHighlightRow[]
): Set<string> {
  const paperTitles = [
    ...new Set(filteredHighlights.map((h) => h.papers_analyzed?.paper_title ?? "Unknown paper")),
  ];
  if (paperTitles.length === 0) return new Set();
  if (paperTitles.length <= 3) return new Set(paperTitles);

  // Find most recently active paper
  const paperLatestDate = new Map<string, string>();
  for (const h of filteredHighlights) {
    const title = h.papers_analyzed?.paper_title ?? "Unknown paper";
    const date = h.created_at ?? "";
    const existing = paperLatestDate.get(title) ?? "";
    if (date > existing) paperLatestDate.set(title, date);
  }
  let mostRecent = paperTitles[0];
  let mostRecentDate = paperLatestDate.get(mostRecent) ?? "";
  for (const title of paperTitles) {
    const date = paperLatestDate.get(title) ?? "";
    if (date > mostRecentDate) {
      mostRecentDate = date;
      mostRecent = title;
    }
  }
  return new Set([mostRecent]);
}

export default function ProjectDetailClient({
  project,
  initialHighlights,
  initialPapers,
  initialDocs,
  initialSavedPapers,
}: Props) {
  const supabase = createClient();

  const [highlights, setHighlights] = useState(initialHighlights);
  const [savedPapers, setSavedPapers] = useState(initialSavedPapers);
  const [linkedDocs] = useState(initialDocs);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [paperFilter, setPaperFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("by-paper");

  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set());
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const indexRef = useRef<HTMLDivElement>(null);

  const exportDocId = useMemo(() => findExportDoc(linkedDocs), [linkedDocs]);

  const lastSynced = useMemo(() => {
    const dates = highlights.map((h) => h.created_at).filter(Boolean) as string[];
    if (dates.length === 0) return project.updated_at;
    return dates.sort((a, b) => b.localeCompare(a))[0];
  }, [highlights, project.updated_at]);

  const filteredHighlights = useMemo(() => {
    const q = search.trim().toLowerCase();
    return highlights.filter((h) => {
      if (q && !highlightMatchesSearch(h, q)) return false;
      if (typeFilter !== "all" && inferHighlightType(h) !== typeFilter) return false;
      if (paperFilter !== "all" && h.paper_id !== paperFilter) return false;
      if (!highlightMatchesDate(h, dateFilter)) return false;
      return true;
    });
  }, [highlights, search, typeFilter, paperFilter, dateFilter]);

  const highlightsByPaper = useMemo(() => {
    const map = new Map<string, ProjectHighlightRow[]>();
    for (const h of filteredHighlights) {
      const title = h.papers_analyzed?.paper_title ?? "Unknown paper";
      const list = map.get(title) ?? [];
      list.push(h);
      map.set(title, list);
    }
    return map;
  }, [filteredHighlights]);

  const highlightsByType = useMemo(() => {
    const map = new Map<HighlightDisplayType, ProjectHighlightRow[]>();
    for (const h of filteredHighlights) {
      const type = inferHighlightType(h);
      const list = map.get(type) ?? [];
      list.push(h);
      map.set(type, list);
    }
    return map;
  }, [filteredHighlights]);

  const paperGroupEntries = useMemo(
    () =>
      [...highlightsByPaper.entries()].sort(([, a], [, b]) => {
        const latestA = a.map((h) => h.created_at ?? "").sort().at(-1) ?? "";
        const latestB = b.map((h) => h.created_at ?? "").sort().at(-1) ?? "";
        return latestB.localeCompare(latestA);
      }),
    [highlightsByPaper]
  );

  const typeGroupEntries = useMemo(() => [...highlightsByType.entries()], [highlightsByType]);

  // Ordered list of all visible highlight IDs for keyboard nav
  const visibleHighlightIds = useMemo(() => {
    if (viewMode === "all") return filteredHighlights.map((h) => h.id);
    if (viewMode === "by-type") {
      return typeGroupEntries.flatMap(([type, items]) =>
        expandedTypes.has(type) ? items.map((h) => h.id) : []
      );
    }
    return paperGroupEntries.flatMap(([title, items]) =>
      expandedPapers.has(title) ? items.map((h) => h.id) : []
    );
  }, [viewMode, filteredHighlights, typeGroupEntries, expandedTypes, paperGroupEntries, expandedPapers]);

  // Smart expand: recompute when filtered set changes
  useEffect(() => {
    setExpandedPapers(computeSmartExpand(filteredHighlights));
    const types = [...new Set(filteredHighlights.map((h) => inferHighlightType(h)))];
    setExpandedTypes(types.length <= 3 ? new Set(types) : new Set(types.slice(0, 1)));
  }, [filteredHighlights]);

  // Clear selection when it's filtered out
  useEffect(() => {
    if (selectedHighlightId && !filteredHighlights.some((h) => h.id === selectedHighlightId)) {
      setSelectedHighlightId(null);
    }
  }, [filteredHighlights, selectedHighlightId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`project-highlights-${project.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "highlights", filter: `project_id=eq.${project.id}` },
        async (payload) => {
          const { data } = await supabase
            .from("highlights")
            .select(
              `id, highlight_text, ai_summary, ai_methodology, ai_findings, ai_limitations,
               ai_relevance, ai_sample_size, created_at, user_note,
               exported_to_google_doc, google_doc_exported_at, paper_id,
               papers_analyzed ( id, paper_title, paper_url )`
            )
            .eq("id", payload.new.id as string)
            .single();
          if (!data) return;
          const paper = Array.isArray(data.papers_analyzed)
            ? data.papers_analyzed[0]
            : data.papers_analyzed;
          const row: ProjectHighlightRow = { ...data, papers_analyzed: paper ?? null };
          setHighlights((prev) => (prev.some((h) => h.id === row.id) ? prev : [row, ...prev]));
          setToast("New highlight captured");
          setTimeout(() => setToast(null), 4000);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "highlights", filter: `project_id=eq.${project.id}` },
        (payload) => {
          setHighlights((prev) => prev.filter((h) => h.id !== (payload.old.id as string)));
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [project.id, supabase]);

  const togglePaperGroup = useCallback((paperTitle: string) => {
    setExpandedPapers((prev) => {
      const next = new Set(prev);
      if (next.has(paperTitle)) next.delete(paperTitle);
      else next.add(paperTitle);
      return next;
    });
  }, []);

  const toggleTypeGroup = useCallback((type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // Keyboard nav on the index
  function handleIndexKeyDown(e: React.KeyboardEvent) {
    const ids = visibleHighlightIds;
    if (ids.length === 0) return;
    const currentIdx = selectedHighlightId ? ids.indexOf(selectedHighlightId) : -1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(currentIdx + 1, ids.length - 1);
      if (next >= 0) {
        setSelectedHighlightId(ids[next]);
        scrollRowIntoView(ids[next]);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(currentIdx - 1, 0);
      if (ids.length > 0) {
        setSelectedHighlightId(ids[next]);
        scrollRowIntoView(ids[next]);
      }
    } else if (e.key === "Escape") {
      setSelectedHighlightId(null);
    }
  }

  function scrollRowIntoView(id: string) {
    const el = indexRef.current?.querySelector(`[data-highlight-id="${id}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }

  // Export
  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return getGoogleAccessToken(async () => session);
  }

  async function exportHighlight(h: ProjectHighlightRow) {
    if (!exportDocId) throw new Error("Link an export Google Doc in the sidebar first.");
    const token = await getToken();
    const analysis = parseHighlightAnalysis({
      summary: h.ai_summary,
      findings: h.ai_findings,
      methodology: h.ai_methodology,
      limitations: h.ai_limitations,
      sample_size: h.ai_sample_size,
      relevance: h.ai_relevance,
    });
    const input = toHighlightExportInput({
      paperTitle: h.papers_analyzed?.paper_title ?? "Unknown paper",
      paperUrl: h.papers_analyzed?.paper_url ?? "",
      highlightText: h.highlight_text,
      analysis,
      timestamp: h.created_at ? formatDate(h.created_at) : formatDate(new Date().toISOString()),
    });
    await appendHighlightExportToGoogleDoc(token, exportDocId, input);
    const exportedAt = new Date().toISOString();
    await supabase
      .from("highlights")
      .update({ exported_to_google_doc: true, google_doc_exported_at: exportedAt })
      .eq("id", h.id);
    setHighlights((prev) =>
      prev.map((row) =>
        row.id === h.id ? { ...row, exported_to_google_doc: true, google_doc_exported_at: exportedAt } : row
      )
    );
  }

  const handleExportOne = useCallback(
    async (id: string) => {
      const h = highlights.find((row) => row.id === id);
      if (!h) return;
      setActionBusy(true);
      setError(null);
      try {
        await exportHighlight(h);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Export failed.");
      } finally {
        setActionBusy(false);
      }
    },
    [highlights, exportDocId]
  );

  async function handleRemoveHighlight(id: string) {
    setActionBusy(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("highlights").delete().eq("id", id);
      if (e) throw new Error(e.message);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove highlight.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRemovePaper(paper: PaperRecommendation) {
    setActionBusy(true);
    setError(null);
    try {
      await removeProjectPaperRecommendation(supabase, paper.id);
      setSavedPapers((prev) => prev.filter((p) => p.id !== paper.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove paper.");
    } finally {
      setActionBusy(false);
    }
  }

  const clearFilters = useCallback(() => {
    setSearch("");
    setTypeFilter("all");
    setPaperFilter("all");
    setDateFilter("all");
  }, []);

  const hasActiveFilters =
    search.trim() !== "" || typeFilter !== "all" || paperFilter !== "all" || dateFilter !== "all";

  const selectedHighlight = selectedHighlightId
    ? highlights.find((h) => h.id === selectedHighlightId) ?? null
    : null;

  // Index content rendering
  function renderIndex() {
    if (filteredHighlights.length === 0) {
      return (
        <div className="px-4 py-8 text-center space-y-2">
          <p className="text-sm text-text-secondary">
            {highlights.length === 0 ? "No highlights yet" : "No highlights match your filters"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      );
    }

    if (viewMode === "all") {
      return (
        <div className="divide-y divide-border-subtle">
          {filteredHighlights.map((h) => (
            <HighlightIndexRow
              key={h.id}
              id={h.id}
              highlightText={h.highlight_text}
              type={inferHighlightType(h)}
              insight={resolveProjectHighlightInsight(h)}
              createdAt={h.created_at}
              selected={selectedHighlightId === h.id}
              onSelect={setSelectedHighlightId}
            />
          ))}
        </div>
      );
    }

    if (viewMode === "by-type") {
      return (
        <div>
          {typeGroupEntries.map(([type, items]) => {
            const expanded = expandedTypes.has(type);
            return (
              <div key={type}>
                <button
                  type="button"
                  onClick={() => toggleTypeGroup(type)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide hover:bg-surface-1 transition-colors border-b border-border-subtle"
                >
                  <ChevronDown
                    size={13}
                    className={`flex-shrink-0 transition-transform duration-150 ${expanded ? "" : "-rotate-90"}`}
                  />
                  {type}
                  <span className="ml-auto font-normal text-text-tertiary">{items.length}</span>
                </button>
                {expanded && (
                  <div className="divide-y divide-border-subtle border-b border-border-subtle">
                    {items.map((h) => (
                      <HighlightIndexRow
                        key={h.id}
                        id={h.id}
                        highlightText={h.highlight_text}
                        type={inferHighlightType(h)}
                        insight={resolveProjectHighlightInsight(h)}
                        createdAt={h.created_at}
                        selected={selectedHighlightId === h.id}
                        onSelect={setSelectedHighlightId}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // by-paper (default)
    return (
      <div>
        {paperGroupEntries.map(([paperTitle, items]) => {
          const expanded = expandedPapers.has(paperTitle);
          const paperUrl = items[0]?.papers_analyzed?.paper_url;
          return (
            <div key={paperTitle}>
              <div className="flex items-center gap-1 px-3 py-2 border-b border-border-subtle bg-surface-bg">
                <button
                  type="button"
                  onClick={() => togglePaperGroup(paperTitle)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide hover:text-text-primary transition-colors"
                >
                  <ChevronDown
                    size={13}
                    className={`flex-shrink-0 transition-transform duration-150 ${expanded ? "" : "-rotate-90"}`}
                  />
                  <span className="line-clamp-1">{paperTitle}</span>
                </button>
                {paperUrl && (
                  <a
                    href={paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1 text-text-tertiary hover:text-accent transition-colors"
                    title="Open source"
                  >
                    <ExternalLink size={11} strokeWidth={2} />
                  </a>
                )}
                <span className="flex-shrink-0 text-[10px] text-text-tertiary ml-1">
                  {items.length}
                </span>
              </div>
              {expanded && (
                <div className="divide-y divide-border-subtle border-b border-border-subtle">
                  {items.map((h) => (
                    <HighlightIndexRow
                      key={h.id}
                      id={h.id}
                      highlightText={h.highlight_text}
                      type={inferHighlightType(h)}
                      insight={resolveProjectHighlightInsight(h)}
                      createdAt={h.created_at}
                      selected={selectedHighlightId === h.id}
                      onSelect={setSelectedHighlightId}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-border-subtle bg-surface-0">
        <h1 className="text-[24px] font-bold text-text-primary leading-tight">{project.name}</h1>
        <p className="mt-1 text-xs text-text-secondary">
          {initialPapers.length} papers · {highlights.length} highlights · {linkedDocs.length} docs
          {lastSynced ? ` · Last activity ${formatRelativeDate(lastSynced)}` : ""}
        </p>
      </div>

      {/* ── Sticky toolbar ─────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-2.5 border-b border-border-subtle bg-surface-0 flex flex-wrap items-center gap-2 z-10">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className={`${INPUT_FIELD} w-full pl-8 text-xs py-1.5`}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className={`${INPUT_FIELD} text-xs py-1.5`}
        >
          <option value="all">All types</option>
          <option value="Summary">Summary</option>
          <option value="Key Finding">Key Finding</option>
          <option value="Methodology">Methodology</option>
          <option value="Limitation">Limitation</option>
          <option value="Highlight">Highlight</option>
        </select>
        <select
          value={paperFilter}
          onChange={(e) => setPaperFilter(e.target.value)}
          className={`${INPUT_FIELD} text-xs py-1.5 max-w-[160px]`}
        >
          <option value="all">All papers</option>
          {initialPapers.map((p) => (
            <option key={p.id} value={p.id}>
              {(p.paper_title ?? p.paper_url).slice(0, 36)}
            </option>
          ))}
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className={`${INPUT_FIELD} text-xs py-1.5`}
        >
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <div className="flex items-center gap-1 ml-auto">
          {(["by-paper", "all", "by-type"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-150 ease-out ${
                viewMode === mode
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-surface-1 border border-border-subtle"
              }`}
            >
              {mode === "by-paper" ? "By paper" : mode === "by-type" ? "By type" : "All"}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-1 transition-colors"
              title="Clear filters"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 px-4 py-2 bg-error-50 border-b border-error/20 text-xs text-error flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Three-column body ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Index column */}
        <div
          ref={indexRef}
          tabIndex={0}
          onKeyDown={handleIndexKeyDown}
          className="w-[320px] flex-shrink-0 border-r border-border-subtle bg-surface-0 overflow-y-auto focus:outline-none"
          aria-label="Highlights index"
        >
          <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
            <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
              Highlights{" "}
              {filteredHighlights.length < highlights.length
                ? `(${filteredHighlights.length} of ${highlights.length})`
                : `(${highlights.length})`}
            </p>
          </div>
          {renderIndex()}
        </div>

        {/* Detail pane */}
        <div className="flex-1 overflow-y-auto bg-surface-bg">
          {selectedHighlight ? (
            <HighlightDetailPanel
              id={selectedHighlight.id}
              highlightText={selectedHighlight.highlight_text}
              type={inferHighlightType(selectedHighlight)}
              paperTitle={selectedHighlight.papers_analyzed?.paper_title ?? null}
              paperUrl={selectedHighlight.papers_analyzed?.paper_url ?? null}
              createdAt={selectedHighlight.created_at}
              exported={!!selectedHighlight.exported_to_google_doc}
              analysisFields={selectedHighlight}
              onClear={() => setSelectedHighlightId(null)}
              onExport={exportDocId ? handleExportOne : undefined}
              onRemove={handleRemoveHighlight}
              busy={actionBusy}
            />
          ) : (
            <ProjectOverview
              project={project}
              highlights={highlights}
              papers={initialPapers}
              linkedDocs={linkedDocs}
              lastSynced={lastSynced}
              onSelectHighlight={setSelectedHighlightId}
            />
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-[300px] flex-shrink-0 border-l border-border-subtle bg-surface-0 overflow-y-auto">
          <div className="p-4 space-y-6">
            <LinkedDocumentsManager projectId={project.id} initialDocs={linkedDocs} />

            {savedPapers.length > 0 && (
              <section className="space-y-2">
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
                  Saved papers ({savedPapers.length})
                </p>
                <div className="space-y-2">
                  {savedPapers.map((paper) => (
                    <LinkedProjectPaperCard
                      key={paper.id}
                      paper={paper}
                      onRemove={() => void handleRemovePaper(paper)}
                      busy={actionBusy}
                    />
                  ))}
                </div>
              </section>
            )}

            {savedPapers.length === 0 && (
              <section>
                <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wide mb-2">
                  Saved papers
                </p>
                <p className="text-xs text-text-tertiary">
                  Papers saved from the extension appear here.
                </p>
              </section>
            )}

            <div className="pt-4 border-t border-border-subtle text-[11px] text-text-tertiary leading-relaxed">
              {highlights.length} highlights · {initialPapers.length} papers · {linkedDocs.length} docs
              {lastSynced && (
                <>
                  <br />
                  Last activity {formatRelativeDate(lastSynced)}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-text-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
