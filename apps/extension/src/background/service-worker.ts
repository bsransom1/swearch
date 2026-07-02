import { supabase } from "../lib/supabase";
import { restoreSession } from "../lib/auth";
import {
  applySession,
  broadcastSessionToWeb,
  broadcastSignOutToWeb,
  clearSession,
  clearSessionCache,
  persistSessionCache,
  WEB_APP_ORIGINS,
} from "../lib/auth-sync";
import {
  AuthSyncMessageType,
  isAuthSyncMessage,
  makeSessionMessage,
} from "@swearch/shared/constants/auth-sync";
import {
  registerContextMenus,
  refreshMenuTitles,
  setupContextMenuListeners,
} from "./context-menu";
import {
  analyzeHighlight,
  askAboutSelection,
  extractClaims,
} from "../lib/claude";
import { storage } from "../lib/storage";
import {
  getActiveProjectId,
  restoreActiveProject,
  setActiveProject as persistActiveProject,
} from "../lib/active-project";
import { fetchExportDocId } from "../lib/project-google-docs";
import { buildProjectContextBundle } from "../lib/project-context";
import { getRecentAnalysisForPaper } from "../lib/highlight-cache";
import { trackHighlightInSession } from "../lib/session-tracking";

setupContextMenuListeners();

supabase.auth.onAuthStateChange((event, session) => {
  if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
    persistSessionCache(session);
    broadcastSessionToWeb({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (event === "SIGNED_IN") {
      restoreActiveProject()
        .then(() => refreshMenuTitles())
        .catch(console.error);
    }
  }

  if (event === "SIGNED_OUT") {
    clearSessionCache();
    broadcastSignOutToWeb();
    chrome.action.setBadgeText({ text: "" });
  }
});

function isAllowedWebSender(sender: chrome.runtime.MessageSender): boolean {
  const url = sender.url ?? "";
  return WEB_APP_ORIGINS.some((origin) => url.startsWith(origin));
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isAuthSyncMessage(message) || !isAllowedWebSender(sender)) {
    return;
  }

  if (message.type === AuthSyncMessageType.Session) {
    applySession({
      access_token: message.access_token,
      refresh_token: message.refresh_token,
    })
      .then((applied) => sendResponse({ ok: true, applied }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === AuthSyncMessageType.SignOut) {
    clearSession()
      .then((cleared) => {
        if (cleared) chrome.action.setBadgeText({ text: "" });
        sendResponse({ ok: true, cleared });
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});

// ── Panel ↔ Background message bridge ────────────────────────────────────────

async function getActiveProjectData() {
  const projectId = await getActiveProjectId();
  if (!projectId) return null;

  const stored = await storage.get(["currentProjectDocId"]);

  const { data } = await supabase
    .from("research_projects")
    .select("id, name, description")
    .eq("id", projectId)
    .single();

  if (!data) return null;

  const exportDocId =
    stored.currentProjectDocId ?? (await fetchExportDocId(data.id));

  const projectContextBundle = await buildProjectContextBundle(data.id, "analyze");

  return {
    id: data.id,
    name: data.name,
    google_doc_id: exportDocId,
    google_doc_title: null,
    description: data.description,
    context: null,
    projectContextBundle,
  };
}

async function getAllProjects() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("research_projects")
    .select("id, name, description, is_active")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data ?? [];
}

async function saveHighlight(params: {
  selectedText: string;
  paperTitle: string;
  paperUrl: string;
  paperDoi: string | null;
  analysis: {
    summary: string;
    methodology: string | null;
    findings: string | null;
    limitations: string | null;
    relevance: string | null;
    sample_size: string | null;
    tags: string[];
  };
  userNote?: string;
}) {
  const projectId = await getActiveProjectId();
  if (!projectId) throw new Error("No active project");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: paper, error: paperError } = await supabase
    .from("papers_analyzed")
    .upsert(
      {
        user_id: user.id,
        project_id: projectId,
        paper_title: params.paperTitle,
        paper_url: params.paperUrl,
        paper_doi: params.paperDoi,
        last_highlighted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,paper_url,project_id" }
    )
    .select()
    .single();

  if (paperError || !paper) {
    throw new Error(paperError?.message ?? "Failed to upsert paper");
  }

  const highlightInsert: Record<string, unknown> = {
    user_id: user.id,
    paper_id: paper.id,
    project_id: projectId,
    highlight_text: params.selectedText,
    ai_summary: params.analysis.summary,
    ai_methodology: params.analysis.methodology,
    ai_findings: params.analysis.findings,
    ai_limitations: params.analysis.limitations,
    ai_relevance: params.analysis.relevance,
    ai_sample_size: params.analysis.sample_size,
  };

  const trimmedNote = params.userNote?.trim();
  if (trimmedNote) {
    highlightInsert.user_note = trimmedNote;
  }

  const { data: highlight, error: hlError } = await supabase
    .from("highlights")
    .insert(highlightInsert as any)
    .select()
    .single();

  if (hlError) throw new Error(hlError.message);

  await supabase.rpc("increment_highlight_count", { paper_id: paper.id });

  const savedId = highlight?.id ?? null;
  if (savedId) {
    trackHighlightInSession(savedId).catch(console.error);
  }

  return { id: savedId };
}

async function checkCachedAnalysis(params: {
  paperUrl: string;
  selectionText: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const projectId = await getActiveProjectId();

  return getRecentAnalysisForPaper(
    params.selectionText,
    params.paperUrl,
    user.id,
    projectId ?? undefined
  );
}

// ── Internal message listener ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Auth sync: content script requests session
  if (isAuthSyncMessage(message) && message.type === AuthSyncMessageType.RequestSession) {
    chrome.storage.local.get(["authToken", "refreshToken"], (result) => {
      if (result.authToken && result.refreshToken) {
        sendResponse(
          makeSessionMessage({
            access_token: result.authToken,
            refresh_token: result.refreshToken,
          })
        );
      } else {
        sendResponse(null);
      }
    });
    return true;
  }

  // Panel bridge: project changed in popup → refresh menu titles
  if (message.type === "SWEARCH_PROJECT_CHANGED") {
    refreshMenuTitles().catch(console.error);
    return false;
  }

  // Panel bridge: analyze highlight
  if (message.type === "SWEARCH_ANALYZE") {
    analyzeHighlight(message.payload)
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Panel bridge: extract claims (mode=claims_only)
  if (message.type === "SWEARCH_EXTRACT_CLAIMS") {
    extractClaims(message.payload)
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Panel bridge: ask about selection
  if (message.type === "SWEARCH_ASK") {
    askAboutSelection(message.payload)
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Panel bridge: get active project
  if (message.type === "SWEARCH_GET_ACTIVE_PROJECT") {
    getActiveProjectData()
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Panel bridge: get all user projects (for NoActiveProjectView)
  if (message.type === "SWEARCH_GET_PROJECTS") {
    getAllProjects()
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Panel bridge: set active project
  if (message.type === "SWEARCH_SET_ACTIVE_PROJECT") {
    persistActiveProject(message.payload.projectId)
      .then(async (data) => {
        await refreshMenuTitles();
        sendResponse({ data });
      })
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Panel bridge: save highlight
  if (message.type === "SWEARCH_SAVE_HIGHLIGHT") {
    saveHighlight(message.payload)
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  // Panel bridge: check for a cached recent analysis
  if (message.type === "SWEARCH_CHECK_CACHED") {
    checkCachedAnalysis(message.payload)
      .then((data) => sendResponse({ data }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function onExtensionReady() {
  await restoreSession();
  await restoreActiveProject();
  await registerContextMenus();
}

chrome.runtime.onStartup.addListener(onExtensionReady);
chrome.runtime.onInstalled.addListener(onExtensionReady);
