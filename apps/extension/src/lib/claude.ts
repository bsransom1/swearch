import { supabase } from "./supabase";
import {
  type HighlightAnalysis,
  parseHighlightAnalysis,
} from "@swearch/shared/types/highlight-analysis";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANALYZE_URL = `${SUPABASE_URL}/functions/v1/analyze-highlight`;
const ASK_URL = `${SUPABASE_URL}/functions/v1/ask-about-selection`;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-with-swearch`;

// ── Chat types + function ────────────────────────────────────────────────────

export interface ChatApiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProjectChatContext {
  name: string;
  description: string | null;
  docExcerpt: string | null;
  recentHighlights: string[];
}

const MAX_HISTORY_MESSAGES = 16; // 8 exchanges

export async function sendChatMessage(
  messages: ChatApiMessage[],
  projectContext: ProjectChatContext | null
): Promise<string> {
  const token = await getAccessToken();

  // TODO: Consider summarizing dropped history instead of hard truncation if
  // users report losing important earlier context.
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
    body: JSON.stringify({ messages: trimmed, projectContext }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Chat request failed ${response.status}: ${text}`);
  }

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data.reply as string;
}

export type { HighlightAnalysis };

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return session.access_token;
}

export async function analyzeHighlight(params: {
  highlightText: string;
  paperTitle: string;
  paperUrl: string;
  projectContext: string;
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
  projectContext: string;
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
  projectContext: string;
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
