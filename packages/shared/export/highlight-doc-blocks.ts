import type { HighlightAnalysis } from "../types/highlight-analysis";
import { getAnalysisSections } from "../types/highlight-analysis";

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
  highlightText: string;
  analysis: HighlightAnalysis;
  timestamp: string;
}

export function buildHighlightExportBlocks(params: HighlightExportParams): DocBlock[] {
  const { paperTitle, paperUrl, highlightText, analysis, timestamp } = params;
  const blocks: DocBlock[] = [{ type: "divider" }];

  blocks.push({ type: "heading", level: 2, text: paperTitle });
  blocks.push({ type: "link", label: "Source", url: paperUrl });
  blocks.push({ type: "meta", text: timestamp });
  blocks.push({ type: "spacer" });

  blocks.push({ type: "heading", level: 3, text: "Highlight" });
  blocks.push({ type: "quote", text: highlightText });

  for (const section of getAnalysisSections(analysis)) {
    blocks.push({
      type: "heading",
      level: 3,
      text: section.label,
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
