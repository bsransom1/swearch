import { supabase } from "./supabase";

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-highlight`;

export interface HighlightAnalysis {
  summary: string;
  methodology: string | null;
  findings: string | null;
  limitations: string | null;
  sample_size: string | null;
  relevance: string | null;
  tags: string[];
}

export async function analyzeHighlight(params: {
  highlightText: string;
  paperTitle: string;
  paperUrl: string;
  projectContext: string;
  projectName: string;
}): Promise<HighlightAnalysis> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Not authenticated");

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edge function error ${response.status}: ${text}`);
  }

  const { data, error } = await response.json();
  if (error) throw new Error(error);

  return data as HighlightAnalysis;
}
