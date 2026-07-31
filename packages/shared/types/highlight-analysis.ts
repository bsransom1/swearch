export interface HighlightAnalysis {
  summary: string;
  methodology: string | null;
  findings: string | null;
  limitations: string | null;
  sample_size: string | null;
  relevance: string | null;
  tags: string[];
}

const EMPTY_ANALYSIS: HighlightAnalysis = {
  summary: "",
  methodology: null,
  findings: null,
  limitations: null,
  sample_size: null,
  relevance: null,
  tags: [],
};

function asNullableString(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** Pulls a JSON object out of plain text or ```json fenced blocks. */
export function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const candidates = fenced ? [fenced[1].trim(), trimmed] : [trimmed];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through
    }

    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // fall through
      }
    }
  }

  return null;
}

function normalizeRecord(raw: Record<string, unknown>): HighlightAnalysis {
  return {
    summary: asNullableString(raw.summary) ?? "",
    methodology: asNullableString(raw.methodology),
    findings: asNullableString(raw.findings),
    limitations: asNullableString(raw.limitations),
    sample_size: asNullableString(raw.sample_size),
    relevance: asNullableString(raw.relevance),
    tags: asTags(raw.tags),
  };
}

/**
 * Normalizes edge-function / Claude output into structured fields. Handles raw
 * JSON strings, markdown-fenced JSON, and the fallback case where the entire
 * payload was stuffed into `summary`.
 */
export function parseHighlightAnalysis(raw: unknown): HighlightAnalysis {
  if (raw == null) return { ...EMPTY_ANALYSIS };

  if (typeof raw === "string") {
    const extracted = extractJsonObject(raw);
    if (extracted) return normalizeRecord(extracted);
    return { ...EMPTY_ANALYSIS, summary: raw.trim() };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_ANALYSIS };
  }

  const record = raw as Record<string, unknown>;

  // Entire analysis JSON sometimes lands in summary when parsing failed upstream.
  if (typeof record.summary === "string") {
    const embedded = extractJsonObject(record.summary);
    if (embedded?.summary != null || embedded?.findings != null) {
      return normalizeRecord({ ...embedded, ...record, ...embedded });
    }
  }

  const normalized = normalizeRecord(record);

  // Last resort: if we only got one blob field, try parsing the whole object as JSON text.
  if (
    !normalized.findings &&
    !normalized.methodology &&
    normalized.summary.startsWith("{")
  ) {
    const extracted = extractJsonObject(normalized.summary);
    if (extracted) return normalizeRecord(extracted);
  }

  return normalized;
}

/** Ordered sections for consistent UI across extension surfaces. */
export const HIGHLIGHT_ANALYSIS_SECTIONS = [
  { key: "summary", label: "Summary", accent: false },
  { key: "findings", label: "Key finding", accent: false },
  { key: "relevance", label: "Relevance to your project", accent: true },
  { key: "methodology", label: "Methodology", accent: false },
  { key: "sample_size", label: "Sample size", accent: false },
  { key: "limitations", label: "Limitations", accent: false },
] as const;

export function getAnalysisSections(analysis: HighlightAnalysis) {
  return HIGHLIGHT_ANALYSIS_SECTIONS.map(({ key, label, accent }) => ({
    key,
    label,
    accent,
    content: analysis[key],
  })).filter((section) => section.content);
}

export type ProjectHighlightInsightKind =
  | "relevance"
  | "findings"
  | "methodology"
  | "limitations"
  | "summary";

export interface ProjectHighlightInsight {
  kind: ProjectHighlightInsightKind;
  label: string;
  text: string;
}

const PROJECT_INSIGHT_LABELS: Record<ProjectHighlightInsightKind, string> = {
  relevance: "For your project",
  findings: "Key finding",
  methodology: "Methodology",
  limitations: "Limitation",
  summary: "Summary",
};

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function projectInsight(
  kind: ProjectHighlightInsightKind,
  text: string
): ProjectHighlightInsight {
  return { kind, label: PROJECT_INSIGHT_LABELS[kind], text };
}

/** Picks a single display insight for Project tab highlight cards (relevance first). */
export function resolveProjectHighlightInsight(h: {
  ai_summary: string | null;
  ai_findings: string | null;
  ai_methodology: string | null;
  ai_limitations: string | null;
  ai_relevance: string | null;
}): ProjectHighlightInsight | null {
  const parsed = h.ai_summary ? parseHighlightAnalysis(h.ai_summary) : null;

  const relevance = trimOrNull(h.ai_relevance) ?? trimOrNull(parsed?.relevance ?? null);
  if (relevance) return projectInsight("relevance", relevance);

  const findings = trimOrNull(h.ai_findings) ?? trimOrNull(parsed?.findings ?? null);
  if (findings) return projectInsight("findings", findings);

  const methodology =
    trimOrNull(h.ai_methodology) ?? trimOrNull(parsed?.methodology ?? null);
  if (methodology) return projectInsight("methodology", methodology);

  const limitations =
    trimOrNull(h.ai_limitations) ?? trimOrNull(parsed?.limitations ?? null);
  if (limitations) return projectInsight("limitations", limitations);

  const parsedSummary = trimOrNull(parsed?.summary);
  if (parsedSummary) return projectInsight("summary", parsedSummary);

  const rawSummary = trimOrNull(h.ai_summary);
  if (rawSummary && !extractJsonObject(rawSummary)) {
    return projectInsight("summary", rawSummary);
  }

  return null;
}

export type HighlightDisplayType =
  | "Summary"
  | "Key Finding"
  | "Methodology"
  | "Limitation"
  | "Highlight";

/** Infers the primary display badge type from raw DB fields. */
export function inferHighlightType(h: {
  ai_findings: string | null;
  ai_methodology: string | null;
  ai_limitations: string | null;
  ai_summary: string | null;
}): HighlightDisplayType {
  if (h.ai_findings?.trim()) return "Key Finding";
  if (h.ai_methodology?.trim()) return "Methodology";
  if (h.ai_limitations?.trim()) return "Limitation";
  if (h.ai_summary?.trim()) return "Summary";
  return "Highlight";
}

export const HIGHLIGHT_DISPLAY_BADGE_CLASS: Record<HighlightDisplayType, string> = {
  Summary: "bg-accent-50 text-accent border-accent-200",
  "Key Finding": "bg-accent-50 text-accent border-accent-200",
  Methodology: "bg-surface-2 text-text-secondary border-border-subtle",
  Limitation: "bg-amber-50 text-amber border-amber-200",
  Highlight: "bg-surface-2 text-text-secondary border-border-subtle",
};
