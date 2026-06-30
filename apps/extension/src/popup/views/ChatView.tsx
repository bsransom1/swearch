import { useCallback, useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { sendChatMessage, type ChatApiMessage, type ProjectChatContext } from "../../lib/claude";
import { findRelatedPapers, type PaperRecommendation } from "../../lib/semantic-scholar";
import { getCurrentPageMetadata, type PageMetadata } from "../../lib/page-context";
import { getSessionHighlightIds } from "../../lib/session-tracking";
import { formatRelativeTime, extractTagsFromSummary } from "../../lib/utils";
import { parseHighlightAnalysis } from "@swearch/shared/types/highlight-analysis";
import ChatHeader from "../components/chat/ChatHeader";
import MessageList from "../components/chat/MessageList";
import ChatInput from "../components/chat/ChatInput";
import type { ChatMessage } from "../components/chat/MessageBubble";
import HighlightCard from "../../components/HighlightCard";
import { appendBlocksToGoogleDoc } from "../../lib/google-docs";
import { SPINNER } from "../../lib/theme";
import { buildHighlightExportBlocks } from "@swearch/shared/export/highlight-doc-blocks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description: string | null;
  google_doc_id: string | null;
  google_doc_title: string | null;
  google_doc_cached_text: string | null;
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
    "Hi! I'm Swearch. Ask me anything about your research, or right-click text on a paper to capture highlights.",
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

  // Page metadata for "Find related"
  const [pageMetadata, setPageMetadata] = useState<PageMetadata | null>(null);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("research_projects")
        .select("id, name, description, google_doc_id, google_doc_title, google_doc_cached_text")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

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
        .select("id, name, description, google_doc_id, google_doc_title, google_doc_cached_text")
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
      await (supabase.rpc as any)("set_active_project", { project_id: projectId });

      const { data } = await supabase
        .from("research_projects")
        .select("id, name, description, google_doc_id, google_doc_title, google_doc_cached_text")
        .eq("id", projectId)
        .maybeSingle();

      setActiveProject(data as Project | null);
      setShowProjectSwitcher(false);

      // Notify service worker so context menu titles update
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

  // ── Page metadata ─────────────────────────────────────────────────────────────
  useEffect(() => {
    getCurrentPageMetadata()
      .then(setPageMetadata)
      .catch(() => {});
  }, []);

  // ── Build project context for Claude ─────────────────────────────────────────
  const buildProjectContext = useCallback(async (): Promise<ProjectChatContext | null> => {
    if (!activeProject) return null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: highlights } = await supabase
        .from("highlights")
        .select("highlight_text")
        .eq("user_id", user.id)
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        name: activeProject.name,
        description: activeProject.description,
        docExcerpt: activeProject.google_doc_cached_text,
        recentHighlights: (highlights || []).map((h) => h.highlight_text),
      };
    } catch {
      return null;
    }
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
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const projectContext = await buildProjectContext();
      const reply = await sendChatMessage(apiMessages, projectContext);

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

  // ── Find related papers ───────────────────────────────────────────────────────
  async function handleFindRelatedPapers() {
    if (!pageMetadata) return;
    setIsThinking(true);

    try {
      const query = pageMetadata.paperAbstract
        ? `${pageMetadata.paperTitle} ${pageMetadata.paperAbstract.slice(0, 200)}`
        : pageMetadata.paperTitle || "";

      const results = await findRelatedPapers(query, 5);

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: formatRelatedPapersMessage(results, pageMetadata.paperTitle),
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Couldn't find related papers: ${e.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
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
    if (!h || !activeProject?.google_doc_id) {
      throw new Error("No Google Doc linked to this project.");
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
    await appendBlocksToGoogleDoc(activeProject.google_doc_id, blocks);
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

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface-0 text-text-primary relative">
      <ChatHeader
        onSettings={onSettings}
        activeProject={activeProject}
        projectLoading={projectLoading}
        onChangeProject={handleOpenProjectSwitcher}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClearChat={handleClearChat}
      />

      {/* Project switcher dropdown */}
      {showProjectSwitcher && (
        <div className="absolute left-0 right-0 mx-3 bg-surface-2 border border-border-subtle rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto" style={{ top: 120 }}>
          {allProjects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-tertiary">Loading projects…</p>
          ) : (
            allProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSwitchProject(p.id)}
                disabled={switchingProject}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-3 transition-colors disabled:opacity-60 ${
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
            className="w-full px-3 py-2 text-xs text-text-tertiary border-t border-border-subtle hover:bg-surface-3 transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      )}

      {activeTab === "chat" && (
        <>
          <MessageList messages={messages} isThinking={isThinking} />

          {/* Paper detection banner */}
          {pageMetadata?.isLikelyPaper && (
            <div className="mx-3 mb-2 px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.2)] flex items-center justify-between flex-shrink-0">
              <p className="text-xs text-text-secondary truncate flex-1 min-w-0 flex items-center gap-2">
                <FileText size={14} strokeWidth={2} className="flex-shrink-0 text-text-tertiary" />
                {pageMetadata.paperTitle}
              </p>
              <button
                type="button"
                onClick={handleFindRelatedPapers}
                disabled={isThinking}
                className="text-xs text-accent hover:text-accent-hover font-medium ml-2 flex-shrink-0 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent/60 rounded px-1"
              >
                Find related →
              </button>
            </div>
          )}

          <ChatInput onSend={handleSend} disabled={isThinking} />
        </>
      )}

      {activeTab === "session" && (
        <SessionHighlightsTab
          highlights={sessionHighlights}
          loading={sessionLoading}
          activeProject={activeProject}
          onExport={handleExportHighlight}
          onDelete={handleDeleteHighlight}
        />
      )}
    </div>
  );
}

// ─── Session activity tab ─────────────────────────────────────────────────────

interface SessionTabProps {
  highlights: StoredHighlight[];
  loading: boolean;
  activeProject: Project | null;
  onExport: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function SessionHighlightsTab({ highlights, loading, activeProject, onExport, onDelete }: SessionTabProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className={SPINNER} />
      </div>
    );
  }

  if (highlights.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <p className="text-sm text-text-tertiary leading-relaxed">
          No highlights captured this session yet.
          <br />
          Right-click text on a paper to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
            linkedDocId={activeProject?.google_doc_id ?? undefined}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelatedPapersMessage(
  papers: PaperRecommendation[],
  sourceTitle: string | null
): string {
  if (papers.length === 0) {
    return `No related papers found for "${sourceTitle}".`;
  }

  const list = papers
    .map((p, i) => {
      const authors =
        p.authors.slice(0, 2).join(", ") + (p.authors.length > 2 ? " et al." : "");
      return `${i + 1}. **${p.title}** (${p.year})\n${authors} · ${p.citationCount} citations\n[View paper](${p.url})`;
    })
    .join("\n\n");

  return `Related papers to **"${sourceTitle}"**:\n\n${list}`;
}
