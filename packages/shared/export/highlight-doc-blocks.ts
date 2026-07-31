import type { HighlightAnalysis } from "../types/highlight-analysis";
import { getAnalysisSections } from "../types/highlight-analysis";
import type { HighlightExportInput } from "./google-docs-batch";

export type DocBlock =
  | { type: "divider" }
  | { type: "spacer" }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "meta"; text: string }
  | { type: "quote"; text: string }
  | { type: "link"; label: string; url: string }
  | { type: "bullets"; items: string[] };

export interface HighlightExportParams {
  paperTitle: string;
  paperUrl: string;
  paperAuthors?: string[] | null;
  paperYear?: number | null;
  highlightText: string;
  analysis: HighlightAnalysis;
  timestamp: string;
}

/** @deprecated Use HighlightExportInput + buildGoogleDocsAppendRequests for Docs API export. */
export function buildHighlightExportBlocks(params: HighlightExportParams): DocBlock[] {
  const { paperTitle, paperUrl, highlightText, analysis, timestamp } = params;
  const blocks: DocBlock[] = [{ type: "divider" }];

  blocks.push({ type: "heading", level: 2, text: paperTitle });
  if (params.paperAuthors?.length || params.paperYear) {
    const parts = [
      params.paperAuthors?.slice(0, 2).join(", "),
      params.paperYear ? String(params.paperYear) : null,
    ].filter(Boolean);
    blocks.push({ type: "meta", text: parts.join(" · ") });
  }
  blocks.push({ type: "link", label: "Source", url: paperUrl });
  blocks.push({ type: "meta", text: `Exported: ${timestamp}` });
  blocks.push({ type: "spacer" });
  blocks.push({ type: "quote", text: highlightText });

  for (const section of getAnalysisSections(analysis)) {
    blocks.push({
      type: "heading",
      level: 3,
      text: section.key === "relevance" ? "Relevance to Your Project" : section.label,
    });
    blocks.push({ type: "paragraph", text: section.content as string });
  }

  if (analysis.tags.length > 0) {
    blocks.push({ type: "heading", level: 3, text: "Tags" });
    blocks.push({ type: "bullets", items: analysis.tags });
  }

  blocks.push({ type: "divider" });
  return blocks;
}

/** Maps legacy export params to the structured Docs API input. */
export function toHighlightExportInput(params: HighlightExportParams): HighlightExportInput {
  return {
    paperTitle: params.paperTitle,
    paperUrl: params.paperUrl,
    paperAuthors: params.paperAuthors,
    paperYear: params.paperYear,
    highlightText: params.highlightText,
    analysis: params.analysis,
    exportedAt: params.timestamp,
  };
}
