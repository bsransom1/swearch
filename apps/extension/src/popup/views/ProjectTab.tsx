import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, FileText, Highlighter, BookOpen } from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  connectGoogleDrive,
  isGoogleDriveConnected,
  listGoogleDocs,
  type GoogleDocSummary,
} from "../../lib/google-docs";
import {
  fetchProjectGoogleDocs,
  linkProjectGoogleDoc,
  refreshProjectGoogleDocCache,
  removeProjectGoogleDoc,
  syncProjectStorageFromDocs,
  updateProjectGoogleDocRole,
  type ProjectGoogleDoc,
} from "../../lib/project-google-docs";
import type { ProjectGoogleDocRole } from "@swearch/shared/types/project-google-doc";
import type { PaperRecommendation } from "@swearch/shared";
import {
  fetchProjectPaperRecommendations,
  removeProjectPaperRecommendation,
} from "../../lib/project-papers";
import GoogleDocPicker from "../components/GoogleDocPicker";
import DocRoleChooser from "../components/DocRoleChooser";
import LinkedProjectDocCard from "../components/LinkedProjectDocCard";
import LinkedProjectPaperCard from "../components/LinkedProjectPaperCard";
import ProjectHighlightCard, {
  inferHighlightType,
} from "../components/project/ProjectHighlightCard";
import { BTN_SECONDARY, SPINNER } from "../../lib/theme";
import { resolveProjectHighlightInsight } from "@swearch/shared/types/highlight-analysis";
import { useShellMode } from "../lib/shell-mode";

interface Props {
  projectId: string | null;
  projectName: string | null;
  isActive: boolean;
}

interface ProjectHighlight {
  id: string;
  highlight_text: string;
  ai_summary: string | null;
  ai_methodology: string | null;
  ai_findings: string | null;
  ai_limitations: string | null;
  ai_relevance: string | null;
  created_at: string | null;
  papers_analyzed: { paper_title: string; paper_url: string } | null;
}

type FlowStep = "list" | "picker" | "choose-role";

const PAPERS_PREVIEW = 5;
const HIGHLIGHTS_PREVIEW = 10;

function SectionHeader({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof FileText;
  title: string;
  count: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
        <Icon size={16} strokeWidth={2} className="text-text-tertiary" />
        <span>
          {title}
          {count > 0 ? ` (${count})` : ""}
        </span>
      </div>
      <div className="h-px bg-border-subtle w-full" />
    </div>
  );
}

export default function ProjectTab({ projectId, projectName, isActive }: Props) {
  const isSidebar = useShellMode() === "sidebar";
  const contentPad = isSidebar ? "px-5" : "px-4";

  const [linkedDocs, setLinkedDocs] = useState<ProjectGoogleDoc[]>([]);
  const [savedPapers, setSavedPapers] = useState<PaperRecommendation[]>([]);
  const [highlights, setHighlights] = useState<ProjectHighlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [googleDocs, setGoogleDocs] = useState<GoogleDocSummary[]>([]);
  const [flowStep, setFlowStep] = useState<FlowStep>("list");
  const [pendingDoc, setPendingDoc] = useState<GoogleDocSummary | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<ProjectGoogleDoc | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [showAllPapers, setShowAllPapers] = useState(false);
  const [showAllHighlights, setShowAllHighlights] = useState(false);
  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set());

  const loadProjectData = useCallback(async () => {
    if (!projectId) {
      setLinkedDocs([]);
      setSavedPapers([]);
      setHighlights([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [docs, papers, highlightsResult] = await Promise.all([
        fetchProjectGoogleDocs(projectId),
        fetchProjectPaperRecommendations(projectId),
        supabase
          .from("highlights")
          .select("*, papers_analyzed(paper_title, paper_url)")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
      ]);

      if (highlightsResult.error) throw new Error(highlightsResult.error.message);

      setLinkedDocs(docs);
      setSavedPapers(papers);
      setHighlights((highlightsResult.data as ProjectHighlight[]) || []);

      if (projectName) {
        await syncProjectStorageFromDocs(projectId, projectName);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load project data.");
    } finally {
      setLoading(false);
    }
  }, [projectId, projectName]);

  useEffect(() => {
    if (!isActive) return;
    loadProjectData();
    isGoogleDriveConnected().then(setDriveConnected).catch(() => setDriveConnected(false));
  }, [isActive, loadProjectData]);

  useEffect(() => {
    setFlowStep("list");
    setPendingDoc(null);
    setRoleChangeTarget(null);
    setShowAllPapers(false);
    setShowAllHighlights(false);
    setExpandedPapers(new Set());
  }, [projectId]);

  const loadGoogleDocs = useCallback(async () => {
    setLoadingDocs(true);
    setError(null);
    try {
      if (!driveConnected) {
        await connectGoogleDrive();
        setDriveConnected(true);
      }
      const docs = await listGoogleDocs();
      setGoogleDocs(docs);
      setDocsLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load Google Docs.");
      setDriveConnected(false);
    } finally {
      setLoadingDocs(false);
    }
  }, [driveConnected]);

  const linkedGoogleDocIds = useMemo(
    () => new Set(linkedDocs.map((d) => d.google_doc_id)),
    [linkedDocs]
  );

  const pickerDocs = useMemo(
    () => googleDocs.filter((d) => !linkedGoogleDocIds.has(d.id)),
    [googleDocs, linkedGoogleDocIds]
  );

  const showBothOption = roleChangeTarget
    ? linkedDocs.length === 1
    : linkedDocs.length === 0;

  const papersVisible = showAllPapers ? savedPapers : savedPapers.slice(0, PAPERS_PREVIEW);

  const highlightsByPaper = useMemo(() => {
    const groups = new Map<string, ProjectHighlight[]>();
    for (const h of highlights) {
      const key = h.papers_analyzed?.paper_title?.trim() || "Unknown source";
      const list = groups.get(key) ?? [];
      list.push(h);
      groups.set(key, list);
    }
    return groups;
  }, [highlights]);

  const highlightEntries = useMemo(() => {
    let total = 0;
    const entries: { paperTitle: string; items: ProjectHighlight[] }[] = [];
    for (const [paperTitle, items] of highlightsByPaper) {
      if (showAllHighlights || total < HIGHLIGHTS_PREVIEW) {
        const remaining = showAllHighlights
          ? items.length
          : Math.max(0, HIGHLIGHTS_PREVIEW - total);
        const slice = items.slice(0, remaining);
        if (slice.length > 0) {
          entries.push({ paperTitle, items: slice });
          total += slice.length;
        }
      }
    }
    return entries;
  }, [highlightsByPaper, showAllHighlights]);

  async function openPicker() {
    setFlowStep("picker");
    setPendingDoc(null);
    setRoleChangeTarget(null);
    if (!docsLoaded) await loadGoogleDocs();
  }

  function cancelFlow() {
    setFlowStep("list");
    setPendingDoc(null);
    setRoleChangeTarget(null);
  }

  async function updateDocRole(doc: ProjectGoogleDoc, role: ProjectGoogleDocRole) {
    if (!projectId || role === doc.role) return;
    setActionBusy(true);
    setError(null);
    try {
      await updateProjectGoogleDocRole(doc.id, projectId, role);
      await loadProjectData();
      chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update document role.");
    } finally {
      setActionBusy(false);
    }
  }

  async function applyDocRole(role: ProjectGoogleDocRole) {
    if (!projectId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setActionBusy(true);
    setError(null);
    try {
      if (roleChangeTarget) {
        await updateProjectGoogleDocRole(roleChangeTarget.id, projectId, role);
      } else if (pendingDoc) {
        await linkProjectGoogleDoc({
          projectId,
          userId: user.id,
          googleDocId: pendingDoc.id,
          title: pendingDoc.name,
          role,
          sortOrder: linkedDocs.length,
        });
      }
      await loadProjectData();
      chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
      cancelFlow();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save document.");
    } finally {
      setActionBusy(false);
    }
  }

  function handlePickerSelect(docId: string) {
    const doc = googleDocs.find((d) => d.id === docId);
    if (!doc) return;
    setPendingDoc(doc);
    setRoleChangeTarget(null);
    setFlowStep("choose-role");
  }

  async function handleSyncDoc(doc: ProjectGoogleDoc) {
    setActionBusy(true);
    setError(null);
    try {
      await refreshProjectGoogleDocCache(doc.id);
      await loadProjectData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to sync document.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRemoveDoc(doc: ProjectGoogleDoc) {
    if (!window.confirm(`Remove "${doc.title}" from this project?`)) return;
    setActionBusy(true);
    setError(null);
    try {
      await removeProjectGoogleDoc(doc.id);
      await loadProjectData();
      chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove document.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRemovePaper(paper: PaperRecommendation) {
    if (!window.confirm(`Remove "${paper.recommended_title}" from this project?`)) return;
    setActionBusy(true);
    setError(null);
    try {
      await removeProjectPaperRecommendation(paper.id);
      await loadProjectData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove paper.");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRemoveHighlight(id: string) {
    setActionBusy(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from("highlights").delete().eq("id", id);
      if (deleteError) throw new Error(deleteError.message);
      await loadProjectData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove highlight.");
    } finally {
      setActionBusy(false);
    }
  }

  function togglePaperGroup(paperTitle: string) {
    setExpandedPapers((prev) => {
      const next = new Set(prev);
      if (next.has(paperTitle)) next.delete(paperTitle);
      else next.add(paperTitle);
      return next;
    });
  }

  if (!projectId) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-text-tertiary leading-relaxed">
          Select an active project from the header to view linked docs, papers, and highlights.
        </p>
      </div>
    );
  }

  if (loading && linkedDocs.length === 0 && savedPapers.length === 0 && highlights.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className={SPINNER} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pt-1 pb-3">
      <div className={`space-y-6 ${contentPad}`}>
      {error && flowStep === "list" && (
        <p className="text-xs text-error bg-error-50 border border-error/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Linked Google Docs */}
      <section className="space-y-3">
        <SectionHeader icon={FileText} title="Linked Google Docs" count={linkedDocs.length} />

        {flowStep === "picker" ? (
          <GoogleDocPicker
            docs={pickerDocs}
            selectedDocId=""
            loading={loadingDocs}
            error={error}
            onSelect={handlePickerSelect}
            onRefresh={loadGoogleDocs}
            onClose={cancelFlow}
          />
        ) : flowStep === "choose-role" ? (
          <DocRoleChooser
            docTitle={roleChangeTarget?.title || pendingDoc?.name || "Document"}
            showBothOption={showBothOption}
            onConfirm={applyDocRole}
            onCancel={cancelFlow}
            busy={actionBusy}
          />
        ) : (
          <div className="space-y-3">
            {linkedDocs.length === 0 ? (
              <div className="bg-surface-1 border border-border-subtle rounded-lg shadow-tier-2 p-3 text-center">
                <p className="text-xs text-text-secondary">No documents linked</p>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Link context docs for AI and export docs for highlights.
                </p>
              </div>
            ) : (
              linkedDocs.map((doc) => (
                <LinkedProjectDocCard
                  key={doc.id}
                  doc={doc}
                  showBothOption={linkedDocs.length === 1 || doc.role === "both"}
                  onRoleChange={(role) => updateDocRole(doc, role)}
                  onRemove={() => handleRemoveDoc(doc)}
                  onSync={() => handleSyncDoc(doc)}
                  busy={actionBusy}
                />
              ))
            )}
            <button
              type="button"
              onClick={openPicker}
              disabled={actionBusy || loadingDocs}
              className={`w-full py-2 text-xs ${BTN_SECONDARY}`}
            >
              {loadingDocs ? "Loading…" : "+ Add document"}
            </button>
          </div>
        )}
      </section>

      {/* Relevant papers */}
      <section className="space-y-3">
        <SectionHeader icon={BookOpen} title="Relevant Papers" count={savedPapers.length} />

        {savedPapers.length === 0 ? (
          <div className="bg-surface-1 border border-border-subtle rounded-lg shadow-tier-2 p-3 text-center">
            <p className="text-xs text-text-secondary">No papers saved yet</p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Use the brain icon in chat on a paper page to discover and add papers.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {papersVisible.map((paper) => (
                <LinkedProjectPaperCard
                  key={paper.id}
                  paper={paper}
                  onRemove={() => handleRemovePaper(paper)}
                  busy={actionBusy}
                />
              ))}
            </div>
            {savedPapers.length > PAPERS_PREVIEW && !showAllPapers && (
              <button
                type="button"
                onClick={() => setShowAllPapers(true)}
                className="text-xs text-accent hover:underline"
              >
                View all papers →
              </button>
            )}
          </>
        )}
      </section>

      {/* Highlights */}
      <section className="space-y-3">
        <SectionHeader icon={Highlighter} title="Highlights" count={highlights.length} />

        {highlights.length === 0 ? (
          <div className="bg-surface-1 border border-border-subtle rounded-lg shadow-tier-2 p-3 text-center">
            <p className="text-xs text-text-secondary">No highlights in this project yet</p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Right-click text on a paper and use Swearch to capture highlights.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {highlightEntries.map(({ paperTitle, items }) => {
                const expanded = expandedPapers.has(paperTitle);
                const totalForPaper = highlightsByPaper.get(paperTitle)?.length ?? items.length;
                const paperUrl = items[0]?.papers_analyzed?.paper_url;
                return (
                  <div key={paperTitle} className="space-y-2">
                    <div className="flex w-full items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => togglePaperGroup(paperTitle)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-text-primary hover:text-accent transition-colors"
                      >
                        <ChevronDown
                          size={16}
                          className={`flex-shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
                        />
                        <span className="line-clamp-1">{paperTitle}</span>
                      </button>
                      {paperUrl && (
                        <a
                          href={paperUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-shrink-0 items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-text-secondary hover:text-accent hover:bg-surface-1 border border-border-subtle transition-colors"
                        >
                          <ExternalLink size={12} strokeWidth={2} />
                          View source
                        </a>
                      )}
                      <span className="flex-shrink-0 text-xs font-normal text-text-tertiary">
                        ({totalForPaper} highlight{totalForPaper === 1 ? "" : "s"})
                      </span>
                    </div>
                    {expanded && (
                      <div className="space-y-3">
                        {items.map((h) => {
                          const type = inferHighlightType(h);
                          const insight = resolveProjectHighlightInsight(h);
                          return (
                            <ProjectHighlightCard
                              key={h.id}
                              id={h.id}
                              highlightText={h.highlight_text}
                              type={type}
                              insight={insight}
                              createdAt={h.created_at}
                              onRemove={handleRemoveHighlight}
                              busy={actionBusy}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {highlights.length > HIGHLIGHTS_PREVIEW && !showAllHighlights && (
              <button
                type="button"
                onClick={() => setShowAllHighlights(true)}
                className="text-xs text-accent hover:underline"
              >
                View all highlights →
              </button>
            )}
          </>
        )}
      </section>
      </div>
    </div>
  );
}
