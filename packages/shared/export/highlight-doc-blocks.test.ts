import { describe, expect, it } from "vitest";
import { buildHighlightExportBlocks } from "./highlight-doc-blocks";
import type { HighlightAnalysis } from "../types/highlight-analysis";

const baseParams = {
  paperTitle: "Quantum Software Tools",
  paperUrl: "https://example.com/paper",
  highlightText: "it is essential that its components be modular",
  timestamp: "June 30, 2026",
};

describe("buildHighlightExportBlocks", () => {
  it("builds minimal export with summary only", () => {
    const analysis: HighlightAnalysis = {
      summary: "Cloud platforms dominate quantum access.",
      methodology: null,
      findings: null,
      limitations: null,
      sample_size: null,
      relevance: null,
      tags: [],
    };

    const blocks = buildHighlightExportBlocks({ ...baseParams, analysis });

    expect(blocks[0]).toEqual({ type: "divider" });
    expect(blocks).toContainEqual({ type: "heading", level: 2, text: baseParams.paperTitle });
    expect(blocks).toContainEqual({
      type: "link",
      label: "Source",
      url: baseParams.paperUrl,
    });
    expect(blocks).toContainEqual({ type: "meta", text: baseParams.timestamp });
    expect(blocks).toContainEqual({ type: "heading", level: 3, text: "Highlight" });
    expect(blocks).toContainEqual({ type: "quote", text: baseParams.highlightText });
    expect(blocks).toContainEqual({ type: "heading", level: 3, text: "Summary" });
    expect(blocks).toContainEqual({
      type: "paragraph",
      text: analysis.summary,
    });
    expect(blocks.at(-1)).toEqual({ type: "divider" });
    expect(blocks.some((b) => b.type === "bullets")).toBe(false);
  });

  it("includes all analysis sections in popup order", () => {
    const analysis: HighlightAnalysis = {
      summary: "Summary text.",
      findings: "Key finding text.",
      relevance: "Relevance text.",
      methodology: "Methodology text.",
      sample_size: "N=120",
      limitations: "Small sample.",
      tags: [],
    };

    const blocks = buildHighlightExportBlocks({ ...baseParams, analysis });
    const headings = blocks
      .filter((b): b is Extract<typeof b, { type: "heading" }> => b.type === "heading")
      .map((b) => b.text);

    expect(headings).toEqual([
      baseParams.paperTitle,
      "Highlight",
      "Summary",
      "Key finding",
      "Relevance to your project",
      "Methodology",
      "Sample size",
      "Limitations",
    ]);
  });

  it("includes tags as bullets when present", () => {
    const analysis: HighlightAnalysis = {
      summary: "Summary only.",
      methodology: null,
      findings: null,
      limitations: null,
      sample_size: null,
      relevance: null,
      tags: ["quantum software", "vendor lock-in"],
    };

    const blocks = buildHighlightExportBlocks({ ...baseParams, analysis });

    expect(blocks).toContainEqual({ type: "heading", level: 3, text: "Tags" });
    expect(blocks).toContainEqual({
      type: "bullets",
      items: ["quantum software", "vendor lock-in"],
    });
  });

  it("omits tags block when tags array is empty", () => {
    const analysis: HighlightAnalysis = {
      summary: "Summary only.",
      methodology: null,
      findings: null,
      limitations: null,
      sample_size: null,
      relevance: null,
      tags: [],
    };

    const blocks = buildHighlightExportBlocks({ ...baseParams, analysis });
    expect(blocks.some((b) => b.type === "bullets")).toBe(false);
    expect(blocks.some((b) => b.type === "heading" && b.text === "Tags")).toBe(false);
  });
});
