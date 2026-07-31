import { describe, expect, it } from "vitest";
import {
  buildCitationString,
  buildGoogleDocsAppendRequests,
  buildHighlightExportContent,
  stripMarkdownForExport,
} from "./google-docs-batch";
import type { HighlightAnalysis } from "../types/highlight-analysis";

const baseInput = {
  paperTitle: "Invasive Squirrels",
  paperUrl: "https://example.com/paper",
  paperAuthors: ["Smith, J.", "Jones, A.", "Lee, B.", "Chen, C."],
  paperYear: 2024,
  highlightText: "Invasive species are one of the leading threats to biodiversity.",
  analysis: {
    summary: "This introduction outlines the ecological impact of invasive species.",
    methodology: null,
    findings: "Native squirrels respond differently than invasive ones.",
    limitations: null,
    sample_size: null,
    relevance: "Directly addresses your research on red squirrel populations.",
    tags: [],
  } satisfies HighlightAnalysis,
};

describe("buildCitationString", () => {
  it("formats APA-style citation with et al for many authors", () => {
    const citation = buildCitationString(baseInput);
    expect(citation).toContain("Smith, J., Jones, A., Lee, B. et al.");
    expect(citation).toContain("(2024)");
    expect(citation).toContain('"Invasive Squirrels."');
    expect(citation).toContain("https://example.com/paper");
  });
});

describe("buildHighlightExportContent", () => {
  it("includes separators, quote, sections, and citation", () => {
    const { text } = buildHighlightExportContent(baseInput);
    expect(text).toContain("Invasive Squirrels");
    expect(text).toContain("Smith, J., Jones, A. et al.");
    expect(text).toContain("Source: https://example.com/paper");
    expect(text).toContain('"Invasive species are one of the leading threats');
    expect(text).toContain("Summary\n");
    expect(text).toContain("Relevance to Your Project\n");
    expect(text).toContain("Key finding\n");
    expect(text).toContain("Citation\n");
  });

  it("strips markdown from section content", () => {
    const { text } = buildHighlightExportContent({
      ...baseInput,
      analysis: {
        ...baseInput.analysis,
        summary: "**Bold** summary with *emphasis*.",
      },
    });
    expect(text).toContain("Bold summary with emphasis.");
    expect(text).not.toContain("**Bold**");
  });
});

describe("stripMarkdownForExport", () => {
  it("removes bold and heading markers", () => {
    expect(stripMarkdownForExport("## Title\n**bold** text")).toBe("Title\nbold text");
  });
});

describe("buildGoogleDocsAppendRequests", () => {
  it("inserts text then clears bullets and applies normal text", () => {
    const requests = buildGoogleDocsAppendRequests(42, baseInput);
    expect(requests[0]).toMatchObject({
      insertText: { location: { index: 42 } },
    });
    expect(requests[1]).toMatchObject({
      deleteParagraphBullets: {
        range: expect.objectContaining({ startIndex: 42 }),
      },
    });
    expect(requests[2]).toMatchObject({
      updateParagraphStyle: {
        paragraphStyle: { namedStyleType: "NORMAL_TEXT" },
      },
    });
    expect(requests.some((r) => "updateTextStyle" in (r as object))).toBe(true);
  });

  it("does not use heading named styles or createParagraphBullets", () => {
    const requests = buildGoogleDocsAppendRequests(1, baseInput);
    const json = JSON.stringify(requests);
    expect(json).not.toContain("HEADING_2");
    expect(json).not.toContain("HEADING_3");
    expect(json).not.toContain("createParagraphBullets");
  });
});
