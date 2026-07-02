import { supabase } from "./supabase";
import {
  type HighlightAnalysis,
  parseHighlightAnalysis,
} from "@swearch/shared/types/highlight-analysis";
import type { ProjectContextBundle } from "@swearch/shared/types/project-chat-context";
import type {
  DiscoveredPaper,
  FindRelatedPapersResult,
  PageContextPayload,
} from "@swearch/shared/types/discovered-paper";
import type { PageMetadata } from "./page-context";
import { withoutEmDash } from "@swearch/shared/text/without-em-dash";

export type { ProjectContextBundle, DiscoveredPaper, FindRelatedPapersResult };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANALYZE_URL = `${SUPABASE_URL}/functions/v1/analyze-highlight`;
const ASK_URL = `${SUPABASE_URL}/functions/v1/ask-about-selection`;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-with-swearch`;
const FIND_PAPERS_URL = `${SUPABASE_URL}/functions/v1/find-related-papers`;

// ── Chat types ───────────────────────────────────────────────────────────────

export interface ChatApiMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_MESSAGES = 16;

export async function sendChatMessage(
  messages: ChatApiMessage[],
  projectContextBundle: ProjectContextBundle | null
): Promise<string> {
  const token = await getAccessToken();

  const trimmed =
    messages.length > MAX_HISTORY_MESSAGES
      ? messages.slice(messages.length - MAX_HISTORY_MESSAGES)
      : messages;

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages: trimmed, projectContextBundle }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Chat request failed ${response.status}: ${text}`);
  }

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return withoutEmDash(data.reply as string);
}

function pageMetadataToContext(meta: PageMetadata): PageContextPayload {
  return {
    url: meta.paperUrl,
    title: meta.paperTitle,
    abstract: meta.paperAbstract,
    doi: meta.paperDoi,
    conclusion: meta.paperConclusion,
    isLikelyPaper: meta.isLikelyPaper,
  };
}

export async function findRelatedPapersViaEdge(
  pageMetadata: PageMetadata,
  projectContextBundle: ProjectContextBundle | null
): Promise<FindRelatedPapersResult> {
  const token = await getAccessToken();

  const response = await fetch(FIND_PAPERS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      pageContext: pageMetadataToContext(pageMetadata),
      projectContextBundle,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Find papers failed ${response.status}: ${text}`);
  }

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data as FindRelatedPapersResult;
}

export type { HighlightAnalysis };

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return session.access_token;
}

// ── Analyze highlight ────────────────────────────────────────────────────────

export async function analyzeHighlight(params: {
  highlightText: string;
  paperTitle: string;
  paperUrl: string;
  projectContextBundle?: ProjectContextBundle | null;
  projectName: string;
  mode?: "full" | "claims_only";
}): Promise<HighlightAnalysis> {
  const token = await getAccessToken();

  const response = await fetch(ANALYZE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edge function error ${response.status}: ${text}`);
  }

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return parseHighlightAnalysis(data);
}

export interface ClaimsResult {
  claims: string[];
}

export async function extractClaims(params: {
  highlightText: string;
  paperTitle: string;
  paperUrl: string;
  projectContextBundle?: ProjectContextBundle | null;
  projectName: string;
}): Promise<ClaimsResult> {
  const token = await getAccessToken();

  const response = await fetch(ANALYZE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...params, mode: "claims_only" }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edge function error ${response.status}: ${text}`);
  }

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  const claims = Array.isArray(data?.claims) ? data.claims : [];
  return { claims };
}

export async function askAboutSelection(params: {
  selectionText: string;
  question: string;
  paperTitle: string;
  paperUrl: string;
  projectContextBundle?: ProjectContextBundle | null;
  projectName: string;
}): Promise<{ answer: string }> {
  const token = await getAccessToken();

  const response = await fetch(ASK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edge function error ${response.status}: ${text}`);
  }

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return { answer: data?.answer ?? "" };
}
