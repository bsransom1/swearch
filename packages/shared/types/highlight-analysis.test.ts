import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  getAnalysisSections,
  parseHighlightAnalysis,
  resolveProjectHighlightInsight,
} from "./highlight-analysis";

const SQUIRREL_JSON = `{
  "summary": "This study compared behavioural responses of native red squirrels and invasive grey squirrels to pine marten scent applied at feeding stations.",
  "methodology": "Field experiment with video observation at 20 sites; behavioural coding of feeding and vigilance; GLMMs with Poisson errors and site as random effect; pre/post treatment comparison over two-day windows",
  "findings": "Red squirrels significantly reduced visits, visit duration, and feeding time while increasing vigilance after pine marten scent application; grey squirrels showed no significant change in visitation or feeding, and actually decreased vigilance, indicating a lack of predator recognition in the invasive species.",
  "limitations": "Red squirrels did not return to four sites after scent application, reducing usable sites for behavioural proportion analysis; image quality issues at two additional sites required their exclusion; pine marten scent efficacy was limited to approximately 48 hours.",
  "sample_size": "10,897 visits across 280 recording days at 20 sites (6,076 grey squirrel visits; 4,741 red squirrel visits); statistical analysis based on 4,178 minutes from 80 days",
  "relevance": "This highlight provides detailed methodology and results on predator-prey behavioural dynamics between native and invasive species, which may be relevant to the test project depending on its focus on invasion ecology, predator recognition, or conservation behaviour.",
  "tags": ["invasive species", "predator recognition", "antipredator behaviour", "squirrel ecology"]
}`;

describe("parseHighlightAnalysis", () => {
  it("parses structured JSON objects", () => {
    const analysis = parseHighlightAnalysis(JSON.parse(SQUIRREL_JSON));
    expect(analysis.summary).toContain("red squirrels");
    expect(analysis.findings).toContain("Red squirrels significantly reduced");
    expect(analysis.tags).toHaveLength(4);
  });

  it("parses markdown-fenced JSON strings", () => {
    const fenced = "```json\n" + SQUIRREL_JSON + "\n```";
    const analysis = parseHighlightAnalysis(fenced);
    expect(analysis.methodology).toContain("Field experiment");
    expect(analysis.sample_size).toContain("10,897 visits");
  });

  it("unwraps JSON embedded in the summary field", () => {
    const analysis = parseHighlightAnalysis({
      summary: SQUIRREL_JSON,
      methodology: null,
      findings: null,
      limitations: null,
      sample_size: null,
      relevance: null,
      tags: [],
    });
    expect(analysis.findings).toContain("predator recognition");
    expect(analysis.relevance).toContain("invasion ecology");
  });

  it("returns ordered display sections without raw JSON", () => {
    const analysis = parseHighlightAnalysis(JSON.parse(SQUIRREL_JSON));
    const sections = getAnalysisSections(analysis);
    expect(sections.map((s) => s.label)).toEqual([
      "Summary",
      "Key finding",
      "Relevance to your project",
      "Methodology",
      "Sample size",
      "Limitations",
    ]);
    expect(sections.every((s) => !s.content?.startsWith("{"))).toBe(true);
  });

  it("extracts JSON from noisy text", () => {
    const extracted = extractJsonObject("Here is the result:\n" + SQUIRREL_JSON);
    expect(extracted?.summary).toContain("native red squirrels");
  });
});

describe("resolveProjectHighlightInsight", () => {
  const base = {
    ai_summary: null,
    ai_findings: null,
    ai_methodology: null,
    ai_limitations: null,
    ai_relevance: null,
  };

  it("prefers ai_relevance column over summary and findings", () => {
    const insight = resolveProjectHighlightInsight({
      ...base,
      ai_summary: "Plain summary text.",
      ai_findings: "A key finding.",
      ai_relevance: "  Connects to invasion ecology.  ",
    });
    expect(insight).toEqual({
      kind: "relevance",
      label: "For your project",
      text: "Connects to invasion ecology.",
    });
  });

  it("uses parsed relevance from ai_summary JSON when column is null", () => {
    const insight = resolveProjectHighlightInsight({
      ...base,
      ai_summary: SQUIRREL_JSON,
    });
    expect(insight?.kind).toBe("relevance");
    expect(insight?.label).toBe("For your project");
    expect(insight?.text).toContain("invasion ecology");
  });

  it("falls back to findings when no relevance", () => {
    const insight = resolveProjectHighlightInsight({
      ...base,
      ai_findings: "Red squirrels reduced feeding time.",
      ai_summary: "Summary that should not show.",
    });
    expect(insight).toEqual({
      kind: "findings",
      label: "Key finding",
      text: "Red squirrels reduced feeding time.",
    });
  });

  it("falls back to methodology then limitations", () => {
    expect(
      resolveProjectHighlightInsight({
        ...base,
        ai_methodology: "Field experiment with video.",
      })
    ).toMatchObject({ kind: "methodology", label: "Methodology" });

    expect(
      resolveProjectHighlightInsight({
        ...base,
        ai_limitations: "Small sample at four sites.",
      })
    ).toMatchObject({ kind: "limitations", label: "Limitation" });
  });

  it("uses summary as last resort for legacy plain-text rows", () => {
    const insight = resolveProjectHighlightInsight({
      ...base,
      ai_summary: "Legacy plain summary only.",
    });
    expect(insight).toEqual({
      kind: "summary",
      label: "Summary",
      text: "Legacy plain summary only.",
    });
  });

  it("returns null when all fields are empty", () => {
    expect(resolveProjectHighlightInsight(base)).toBeNull();
    expect(
      resolveProjectHighlightInsight({
        ...base,
        ai_summary: "   ",
        ai_relevance: "",
      })
    ).toBeNull();
  });

  it("does not return findings when relevance is present", () => {
    const insight = resolveProjectHighlightInsight({
      ...base,
      ai_relevance: "Project tie-in.",
      ai_findings: "Should be ignored.",
    });
    expect(insight?.kind).toBe("relevance");
    expect(insight?.text).not.toContain("Should be ignored");
  });
});
