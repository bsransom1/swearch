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
