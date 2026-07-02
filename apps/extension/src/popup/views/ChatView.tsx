import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { sendChatMessage, findRelatedPapersViaEdge, type ChatApiMessage } from "../../lib/claude";
import type { DiscoveredPaper } from "@swearch/shared/types/discovered-paper";
import { getCurrentPageMetadata, canRecommendRelatedPapers, type PageMetadata } from "../../lib/page-context";
import { getSessionHighlightIds } from "../../lib/session-tracking";
import { formatRelativeTime, extractTagsFromSummary } from "../../lib/utils";
import { parseHighlightAnalysis } from "@swearch/shared/types/highlight-analysis";
import ChatHeader from "../components/chat/ChatHeader";
import MessageList from "../components/chat/MessageList";
import ChatInput from "../components/chat/ChatInput";
import SuggestedQuestions from "../components/chat/SuggestedQuestions";
import { SUGGESTED_QUESTIONS } from "../constants";
import type { ChatMessage } from "../components/chat/MessageBubble";
import HighlightCard from "../../components/HighlightCard";
import { appendBlocksToGoogleDoc, resolveLinkedDocId } from "../../lib/google-docs";
import {
  fetchExportDocId,
} from "../../lib/project-google-docs";
import {
  getActiveProject,
  setActiveProject as persistActiveProject,
} from "../../lib/active-project";
import { buildProjectContextBundle } from "../../lib/project-context";
import {
  addPapersToProject,
  findSourcePaperId,
} from "../../lib/project-papers";
import { SPINNER } from "../../lib/theme";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { buildHighlightExportBlocks } from "@swearch/shared/export/highlight-doc-blocks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description: string | null;
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
  papers_analyzed: { paper_title: string; paper_url: string } | null;
}

type Tab = "chat" | "session";

// ─── Session chat persistence ─────────────────────────────────────────────────

const CHAT_SESSION_KEY = "swearchChatHistory";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm Swearch. Ask me anything about your research. I have context from your linked Google Docs, saved related papers, and captured highlights. Right-click text on a paper to capture more.",
  timestamp: new Date().toISOString(),
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatView({ onSettings }: { onSettings: () => void }) {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesInitialised = useRef(false);

  // Project state
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [switchingProject, setSwitchingProject] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  // Session activity
  const [sessionHighlights, setSessionHighlights] = useState<StoredHighlight[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Page metadata for related-papers discovery (brain icon)
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);
  const [pageMetadataLoading, setPageMetadataLoading] = useState(true);
  const [papersAddBusy, setPapersAddBusy] = useState(false);
  const [exportDocId, setExportDocId] = useState<string | null>(null);

  // ── Restore chat from session storage ────────────────────────────────────────
  useEffect(() => {
    async function restoreChat() {
      try {
        const result = await chrome.storage.session.get([CHAT_SESSION_KEY]);
        const stored = result[CHAT_SESSION_KEY] as ChatMessage[] | undefined;
        if (stored && stored.length > 0) {
          setMessages(stored);
        }
      } catch {
        // session storage may be unavailable — start fresh
      }
      messagesInitialised.current = true;
    }
    restoreChat();
  }, []);

  // Persist chat after every update (skip initial restore pass)
  useEffect(() => {
    if (!messagesInitialised.current) return;
    if (messages.length <= 1 && messages[0]?.id === "welcome") return;
    chrome.storage.session
      .set({ [CHAT_SESSION_KEY]: messages })
      .catch(() => {});
  }, [messages]);

  // ── Load active project ───────────────────────────────────────────────────────
  useEffect(() => {
    loadActiveProject();
  }, []);

  async function loadActiveProject() {
    setProjectLoading(true);
    try {
      const data = await getActiveProject();
      setActiveProject(data as Project | null);
    } catch (e) {
      console.error("[Swearch] Failed to load project:", e);
    } finally {
      setProjectLoading(false);
    }
  }

  // ── Project switcher ──────────────────────────────────────────────────────────
  async function handleOpenProjectSwitcher() {
    setShowProjectSwitcher(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("research_projects")
        .select("id, name, description")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      setAllProjects((data as Project[]) || []);
    } catch (e) {
      console.error("[Swearch] Failed to load projects:", e);
    }
  }

  async function handleSwitchProject(projectId: string) {
    setSwitchingProject(true);
    try {
      const data = await persistActiveProject(projectId);
      setActiveProject(data as Project | null);
      setShowProjectSwitcher(false);

      chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
    } catch (e) {
      console.error("[Swearch] Failed to switch project:", e);
    } finally {
      setSwitchingProject(false);
    }
  }

  // ── Session activity ──────────────────────────────────────────────────────────
  async function loadSessionHighlights() {
    setSessionLoading(true);
    try {
      const ids = await getSessionHighlightIds();
      if (ids.length === 0) {
        setSessionHighlights([]);
        return;
      }
      const { data } = await supabase
        .from("highlights")
        .select("*, papers_analyzed(paper_title, paper_url)")
        .in("id", ids)
        .order("created_at", { ascending: false });
      setSessionHighlights((data as StoredHighlight[]) || []);
    } catch (e) {
      console.error("[Swearch] Failed to load session highlights:", e);
    } finally {
      setSessionLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "session") {
      loadSessionHighlights();
    }
  }, [activeTab]);

  // ── Page metadata — parse active tab as soon as the popup opens
  const refreshPageMetadata = useCallback(async () => {
    setPageMetadataLoading(true);
    try {
      const data = await getCurrentPageMetadata();
      setPageMetadata(data);
    } catch {
      setPageMetadata(null);
    } finally {
      setPageMetadataLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPageMetadata();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshPageMetadata();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshPageMetadata]);

  useEffect(() => {
    if (!activeProject) {
      setExportDocId(null);
      return;
    }
    fetchExportDocId(activeProject.id).then(setExportDocId).catch(() => setExportDocId(null));
  }, [activeProject?.id]);

  // ── Build project context for Claude ─────────────────────────────────────────
  const getContextBundle = useCallback(async () => {
    if (!activeProject) return null;
    return buildProjectContextBundle(activeProject.id, "chat");
  }, [activeProject]);

  // ── Send message ──────────────────────────────────────────────────────────────
  async function handleSend(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsThinking(true);

    try {
      const apiMessages: ChatApiMessage[] = updatedMessages
        .filter((m) => m.id !== "welcome" && m.kind !== "papers")
        .map((m) => ({ role: m.role, content: m.content }));

      const projectContextBundle = await getContextBundle();
      const reply = await sendChatMessage(apiMessages, projectContextBundle);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, something went wrong: ${e.message}. Try again?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  // ── Brain: find related papers in chat ───────────────────────────────────────
  async function handleBrainClick() {
    const freshMeta = await getCurrentPageMetadata();
    setPageMetadata(freshMeta);
    if (!freshMeta || !canRecommendRelatedPapers(freshMeta)) return;

    const titleLabel = freshMeta.paperTitle ?? "this page";
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Find relevant papers to this one",
      timestamp: new Date().toISOString(),
      kind: "text",
    };
    const loadingId = crypto.randomUUID();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: "assistant",
      content: `Searching OpenAlex for papers related to "${titleLabel}"…`,
      timestamp: new Date().toISOString(),
      kind: "papers",
      papers: [],
      isLoading: true,
    };

    setMessages((prev) => {
      const history = prev.filter((m) => m.id !== "welcome");
      return [userMsg, loadingMsg, ...history];
    });

    try {
      const bundle = activeProject
        ? await buildProjectContextBundle(activeProject.id, "chat")
        : null;
      const { papers, searchQuery } = await findRelatedPapersViaEdge(freshMeta, bundle);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                isLoading: false,
                content: papers.length
                  ? ""
                  : "No related papers found. Try a paper with a clearer title or abstract.",
                papers,
                searchQuery,
                addedOpenalexIds: [],
              }
            : m
        )
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Search failed";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                ...m,
                isLoading: false,
                content: `Couldn't find papers: ${message}`,
                papers: [],
              }
            : m
        )
      );
    }
  }

  async function handleAddPaperToProject(messageId: string, paper: DiscoveredPaper) {
    if (!activeProject) return;
    setPapersAddBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const sourcePaperId = pageMetadata?.paperUrl
        ? await findSourcePaperId(activeProject.id, pageMetadata.paperUrl)
        : null;

      const { added, skipped } = await addPapersToProject({
        projectId: activeProject.id,
        userId: user.id,
        papers: [paper],
        sourcePaperId,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                addedOpenalexIds: [...(m.addedOpenalexIds ?? []), paper.openalexId],
              }
            : m
        )
      );

      const note =
        added > 0
          ? `Added "${paper.title}" to your project.`
          : skipped > 0
            ? `"${paper.title}" is already in your project.`
            : `Could not add "${paper.title}".`;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: note,
          timestamp: new Date().toISOString(),
          kind: "text",
        },
      ]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to add paper";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
          timestamp: new Date().toISOString(),
          kind: "text",
        },
      ]);
    } finally {
      setPapersAddBusy(false);
    }
  }

  async function handleAddAllPapersToProject(messageId: string, papers: DiscoveredPaper[]) {
    if (!activeProject || papers.length === 0) return;
    setPapersAddBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const sourcePaperId = pageMetadata?.paperUrl
        ? await findSourcePaperId(activeProject.id, pageMetadata.paperUrl)
        : null;

      const { added, skipped } = await addPapersToProject({
        projectId: activeProject.id,
        userId: user.id,
        papers,
        sourcePaperId,
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                addedOpenalexIds: [
                  ...(m.addedOpenalexIds ?? []),
                  ...papers.map((p) => p.openalexId),
                ],
              }
            : m
        )
      );

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            added > 0
              ? `Added ${added} paper${added === 1 ? "" : "s"} to your project${skipped ? ` (${skipped} already saved)` : ""}.`
              : "Those papers are already in your project.",
          timestamp: new Date().toISOString(),
          kind: "text",
        },
      ]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to add papers";
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: message,
          timestamp: new Date().toISOString(),
          kind: "text",
        },
      ]);
    } finally {
      setPapersAddBusy(false);
    }
  }

  // ── Clear chat ────────────────────────────────────────────────────────────────
  function handleClearChat() {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date().toISOString() }]);
    chrome.storage.session.remove([CHAT_SESSION_KEY]).catch(() => {});
  }

  // ── Highlight card callbacks (session tab) ────────────────────────────────────
  async function handleExportHighlight(id: string) {
    const h = sessionHighlights.find((x) => x.id === id);
    const docId = await resolveLinkedDocId();
    if (!h || !docId) {
      throw new Error("No export doc linked to this project.");
    }
    const parsed = h.ai_summary ? parseHighlightAnalysis(h.ai_summary) : null;
    const analysis = {
      summary: parsed?.summary || h.ai_summary || "",
      methodology: h.ai_methodology ?? null,
      findings: h.ai_findings ?? null,
      limitations: h.ai_limitations ?? null,
      relevance: h.ai_relevance ?? null,
      sample_size: h.ai_sample_size ?? null,
      tags: parsed?.tags || [],
    };
    const blocks = buildHighlightExportBlocks({
      paperTitle: h.papers_analyzed?.paper_title || "Unknown",
      paperUrl: h.papers_analyzed?.paper_url || "",
      highlightText: h.highlight_text,
      analysis,
      timestamp: h.created_at ? new Date(h.created_at).toLocaleString() : new Date().toLocaleString(),
    });
    await appendBlocksToGoogleDoc(docId, blocks);
    await supabase
      .from("highlights")
      .update({ exported_to_google_doc: true, google_doc_exported_at: new Date().toISOString() })
      .eq("id", id);
    setSessionHighlights((prev) =>
      prev.map((x) => (x.id === id ? { ...x, exported_to_google_doc: true } : x))
    );
  }

  async function handleDeleteHighlight(id: string) {
    const { error } = await supabase.from("highlights").delete().eq("id", id);
    if (error) throw new Error(error.message);
    setSessionHighlights((prev) => prev.filter((x) => x.id !== id));
  }

  const showSuggestedQuestions = !messages.some((m) => m.role === "user");

  const relatedPapersEnabled =
    pageMetadataLoading || canRecommendRelatedPapers(pageMetadata);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex flex-col min-h-0 flex-1 h-full bg-surface-0 border border-border-default rounded-xl shadow-tier-1 overflow-hidden">
        <ChatHeader
          onSettings={onSettings}
          activeProject={activeProject}
          projectLoading={projectLoading}
          onChangeProject={handleOpenProjectSwitcher}
          onClearChat={handleClearChat}
          isLikelyPaper={relatedPapersEnabled}
          onOpenRelatedPapers={handleBrainClick}
        />

        {/* Project switcher dropdown — below single-row header */}
        {showProjectSwitcher && (
          <div
            className="swearch-popover-in absolute left-4 right-4 bg-surface-0 border border-border-default rounded-lg shadow-tier-1 z-50 max-h-48 overflow-y-auto"
            style={{ top: 48 }}
          >
            {allProjects.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-tertiary">Loading projects…</p>
            ) : (
              allProjects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSwitchProject(p.id)}
                  disabled={switchingProject}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-1 transition-colors duration-150 disabled:opacity-60 ${
                    p.id === activeProject?.id ? "text-accent font-medium" : "text-text-secondary"
                  }`}
                >
                  {p.name}
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => setShowProjectSwitcher(false)}
              className="w-full px-3 py-2 text-xs text-text-tertiary border-t border-border-subtle hover:bg-surface-1 transition-colors duration-150 text-center"
            >
              Cancel
            </button>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as Tab)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden px-4"
        >
          <TabsList className="mt-2 mb-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="session">Session</TabsTrigger>
          </TabsList>

          <TabsContent
            value="chat"
            className="flex flex-col flex-1 min-h-0 h-0 overflow-hidden outline-none"
          >
            <MessageList
              messages={messages}
              isThinking={isThinking}
              activeProjectId={activeProject?.id ?? null}
              onAddPaper={handleAddPaperToProject}
              onAddAllPapers={handleAddAllPapersToProject}
              addBusy={papersAddBusy}
            />

            {showSuggestedQuestions && (
              <SuggestedQuestions
                questions={SUGGESTED_QUESTIONS}
                onSelect={handleSend}
                disabled={isThinking}
              />
            )}

            <ChatInput onSend={handleSend} disabled={isThinking} />
          </TabsContent>

          <TabsContent
            value="session"
            className="flex flex-col flex-1 min-h-0 h-0 overflow-hidden outline-none"
          >
            <SessionHighlightsTab
              highlights={sessionHighlights}
              loading={sessionLoading}
              exportDocId={exportDocId}
              onExport={handleExportHighlight}
              onDelete={handleDeleteHighlight}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Session activity tab ─────────────────────────────────────────────────────

interface SessionTabProps {
  highlights: StoredHighlight[];
  loading: boolean;
  exportDocId: string | null;
  onExport: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function SessionHighlightsTab({ highlights, loading, exportDocId, onExport, onDelete }: SessionTabProps) {
  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className={SPINNER} />
      </div>
    );
  }

  if (highlights.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 text-center">
        <p className="text-sm text-text-tertiary leading-relaxed">
          No highlights captured this session yet.
          <br />
          Right-click text on a paper to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto py-1 space-y-3">
      {highlights.map((h) => {
        const parsed = h.ai_summary ? parseHighlightAnalysis(h.ai_summary) : null;
        const analysis = {
          summary: parsed?.summary || h.ai_summary || "",
          methodology: h.ai_methodology ?? null,
          findings: h.ai_findings ?? null,
          limitations: h.ai_limitations ?? null,
          relevance: h.ai_relevance ?? null,
          sample_size: h.ai_sample_size ?? null,
          tags: parsed?.tags || [],
        };
        return (
          <HighlightCard
            key={h.id}
            id={h.id}
            highlightText={h.highlight_text}
            paperTitle={h.papers_analyzed?.paper_title || "Untitled"}
            paperUrl={h.papers_analyzed?.paper_url || ""}
            tags={extractTagsFromSummary(h)}
            summary={analysis.summary || undefined}
            relevance={analysis.relevance ?? undefined}
            methodology={analysis.methodology ?? undefined}
            findings={analysis.findings ?? undefined}
            limitations={analysis.limitations ?? undefined}
            sampleSize={analysis.sample_size ?? undefined}
            timestamp={h.created_at ? formatRelativeTime(h.created_at) : "Unknown"}
            isExported={!!h.exported_to_google_doc}
            linkedDocId={exportDocId ?? undefined}
            onExport={onExport}
            onCopy={async (text) => {
              await navigator.clipboard.writeText(text);
            }}
            onDelete={onDelete}
            compact
          />
        );
      })}
    </div>
  );
}

