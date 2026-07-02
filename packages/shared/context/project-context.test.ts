import { describe, it, expect } from "vitest";
import {
  buildDocumentContent,
  buildHighlightContext,
  buildProjectContextBundle,
  buildSavedPaperContext,
  buildSavedPaperInventory,
  formatProjectContextForPrompt,
} from "../types/project-chat-context";
import { buildLinkedDocInventory } from "../types/project-google-doc";
import type { ProjectGoogleDoc as PGD } from "../types/project-google-doc";

// Local alias to avoid TS name collision with the import
type ProjectGoogleDoc = PGD;
import type { ProjectGoogleDoc } from "../types/project-google-doc";

function makeDoc(
  overrides: Partial<ProjectGoogleDoc> & { role: "context" | "export" | "both" }
): ProjectGoogleDoc {
  return {
    id: "doc-1",
    project_id: "proj-1",
    user_id: "user-1",
    google_doc_id: "gdoc-1",
    title: "Test Doc",
    cached_text: null,
    cached_at: null,
    summary: null,
    summary_at: null,
    sort_order: 0,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

describe("buildLinkedDocInventory", () => {
  it("includes all docs regardless of role or cache", () => {
    const docs = [
      makeDoc({ role: "context", title: "A", cached_text: "hello" }),
      makeDoc({ role: "export", title: "B", cached_text: null }),
      makeDoc({ role: "both", title: "C", summary: "summary" }),
    ];
    const inv = buildLinkedDocInventory(docs);
    expect(inv).toHaveLength(3);
    expect(inv[0]).toMatchObject({ title: "A", role: "context", synced: true });
    expect(inv[1]).toMatchObject({ title: "B", role: "export", synced: false });
    expect(inv[2]).toMatchObject({ title: "C", role: "both", synced: true });
  });

  it("marks doc as not synced when both cache and summary are empty", () => {
    const inv = buildLinkedDocInventory([makeDoc({ role: "context", cached_text: null, summary: null })]);
    expect(inv[0].synced).toBe(false);
  });
});

describe("buildDocumentContent", () => {
  it("excludes export-only docs", () => {
    const docs = [
      makeDoc({ role: "export", title: "Export Doc", cached_text: "export content" }),
    ];
    expect(buildDocumentContent(docs)).toHaveLength(0);
  });

  it("skips context docs with no cache and no summary", () => {
    const docs = [makeDoc({ role: "context", cached_text: null, summary: null })];
    expect(buildDocumentContent(docs)).toHaveLength(0);
  });

  it("includes context docs with cached text", () => {
    const docs = [makeDoc({ role: "context", cached_text: "some text about the project" })];
    const content = buildDocumentContent(docs);
    expect(content).toHaveLength(1);
    expect(content[0].excerpt).toBe("some text about the project");
  });

  it("prefers summary over cached_text", () => {
    const docs = [
      makeDoc({ role: "context", cached_text: "raw text", summary: "nice summary" }),
    ];
    const content = buildDocumentContent(docs);
    expect(content[0].excerpt).toBe("nice summary");
  });

  it("includes both docs in a mixed list", () => {
    const docs = [
      makeDoc({ id: "1", role: "context", title: "A", cached_text: "context content" }),
      makeDoc({ id: "2", role: "export", title: "B", cached_text: "export content" }),
      makeDoc({ id: "3", role: "both", title: "C", summary: "both summary" }),
    ];
    const content = buildDocumentContent(docs);
    const titles = content.map((c) => c.title);
    expect(titles).toContain("A");
    expect(titles).not.toContain("B");
    expect(titles).toContain("C");
  });

  it("respects per-doc and total char limits", () => {
    const docs = [
      makeDoc({ id: "1", role: "context", title: "A", cached_text: "a".repeat(1000) }),
      makeDoc({ id: "2", role: "context", title: "B", cached_text: "b".repeat(1000) }),
    ];
    const content = buildDocumentContent(docs, { perDocChars: 100, totalChars: 150 });
    expect(content[0].excerpt).toHaveLength(100);
    expect(content[1].excerpt).toHaveLength(50);
  });
});

describe("buildHighlightContext", () => {
  const rows = [
    { highlight_text: "raw text A", ai_summary: "summary A", paperTitle: "Paper 1" },
    { highlight_text: "raw text B", ai_summary: null, paperTitle: "Paper 2" },
    { highlight_text: "raw text C", ai_summary: "summary C", paperTitle: null },
  ];

  it("prefers ai_summary over highlight_text", () => {
    const result = buildHighlightContext(rows, "chat");
    expect(result[0].text).toBe("summary A");
    expect(result[1].text).toBe("raw text B");
  });

  it("respects task-specific count for claims (3)", () => {
    const manyRows = Array.from({ length: 10 }, (_, i) => ({
      highlight_text: `text ${i}`,
      ai_summary: null,
      paperTitle: null,
    }));
    const result = buildHighlightContext(manyRows, "claims");
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("respects task-specific count for chat (15)", () => {
    const manyRows = Array.from({ length: 20 }, (_, i) => ({
      highlight_text: `text ${i}`,
      ai_summary: null,
      paperTitle: null,
    }));
    const result = buildHighlightContext(manyRows, "chat");
    expect(result.length).toBeLessThanOrEqual(15);
  });
});

function makeSavedPaper(
  overrides: Partial<{
    recommended_title: string;
    recommended_authors: string[] | null;
    recommended_year: number | null;
    recommended_abstract: string | null;
    relevance_reason: string | null;
    recommended_url: string | null;
  }> = {}
) {
  return {
    recommended_title: "Test Paper",
    recommended_authors: ["Jane Doe"],
    recommended_year: 2024,
    recommended_abstract: "Abstract about predators.",
    relevance_reason: null,
    recommended_url: "https://doi.org/10.1234/example",
    ...overrides,
  };
}

describe("buildSavedPaperInventory", () => {
  it("returns all saved paper titles", () => {
    const rows = [
      makeSavedPaper({ recommended_title: "Paper A" }),
      makeSavedPaper({ recommended_title: "Paper B", recommended_abstract: null, relevance_reason: null }),
    ];
    const inv = buildSavedPaperInventory(rows);
    expect(inv).toHaveLength(2);
    expect(inv[0].title).toBe("Paper A");
    expect(inv[0].hasContent).toBe(true);
    expect(inv[1].title).toBe("Paper B");
    expect(inv[1].hasContent).toBe(false);
  });
});

describe("buildSavedPaperContext", () => {
  it("respects per-paper and total excerpt limits", () => {
    const rows = [
      makeSavedPaper({ recommended_title: "A", recommended_abstract: "a".repeat(500) }),
      makeSavedPaper({ recommended_title: "B", recommended_abstract: "b".repeat(500) }),
    ];
    const content = buildSavedPaperContext(rows);
    expect(content[0].excerpt).toHaveLength(400);
    expect(content[1].excerpt).toHaveLength(400);
    const total = content.reduce((n, c) => n + c.excerpt.length, 0);
    expect(total).toBeLessThanOrEqual(3000);
  });

  it("skips rows with no abstract or relevance text", () => {
    const rows = [makeSavedPaper({ recommended_abstract: null, relevance_reason: null })];
    expect(buildSavedPaperContext(rows)).toHaveLength(0);
  });
});

describe("buildProjectContextBundle", () => {
  it("puts all docs in linkedDocs and only context docs in documentContent", () => {
    const project = { id: "p", name: "My Project", description: null };
    const docs = [
      makeDoc({ id: "1", role: "context", title: "A", cached_text: "text" }),
      makeDoc({ id: "2", role: "export", title: "B", cached_text: "text" }),
    ];
    const bundle = buildProjectContextBundle(project, docs, [], "chat");
    expect(bundle.linkedDocs).toHaveLength(2);
    expect(bundle.documentContent).toHaveLength(1);
    expect(bundle.documentContent[0].title).toBe("A");
  });

  it("includes saved paper inventory and excerpts", () => {
    const project = { id: "p", name: "My Project", description: null };
    const papers = [
      makeSavedPaper({ recommended_title: "Saved A" }),
      makeSavedPaper({ recommended_title: "Saved B", recommended_abstract: "theme B" }),
    ];
    const bundle = buildProjectContextBundle(project, [], [], "chat", papers);
    expect(bundle.savedPaperInventory).toHaveLength(2);
    expect(bundle.savedPapers.length).toBeGreaterThan(0);
  });
});

describe("formatProjectContextForPrompt", () => {
  it("includes inventory list for all docs", () => {
    const project = { id: "p", name: "MyProject", description: null };
    const docs = [
      makeDoc({ id: "1", role: "context", title: "A Doc", cached_text: "text" }),
      makeDoc({ id: "2", role: "export", title: "B Doc", cached_text: null }),
    ];
    const bundle = buildProjectContextBundle(project, docs, [], "chat");
    const prompt = formatProjectContextForPrompt(bundle);
    expect(prompt).toContain('"A Doc" [Context] — synced');
    expect(prompt).toContain('"B Doc" [Export] — not synced');
  });

  it("does not include doc content when includeDocContent is false", () => {
    const project = { id: "p", name: "X", description: null };
    const docs = [makeDoc({ role: "context", title: "Doc", cached_text: "secret content" })];
    const bundle = buildProjectContextBundle(project, docs, [], "claims");
    const prompt = formatProjectContextForPrompt(bundle, { includeDocContent: false });
    expect(prompt).not.toContain("secret content");
    expect(prompt).toContain('"Doc"');
  });

  it("does not claim inability to access Google Docs — model can list them", () => {
    const project = { id: "p", name: "P", description: null };
    const docs = [makeDoc({ role: "context", title: "My Notes", cached_text: null })];
    const bundle = buildProjectContextBundle(project, docs, [], "chat");
    const prompt = formatProjectContextForPrompt(bundle);
    expect(prompt).toContain("not synced");
    expect(prompt).toContain("do NOT claim you cannot access Google Docs");
  });

  it("includes related papers inventory and anti-highlight instruction", () => {
    const project = { id: "p", name: "P", description: null };
    const papers = [
      makeSavedPaper({ recommended_title: "Predator Paper", recommended_authors: ["A", "B", "C"] }),
      makeSavedPaper({ recommended_title: "Neophobia Review" }),
    ];
    const bundle = buildProjectContextBundle(project, [], [], "chat", papers);
    const prompt = formatProjectContextForPrompt(bundle);
    expect(prompt).toContain("RELATED PAPERS (inventory");
    expect(prompt).toContain('"Predator Paper"');
    expect(prompt).toContain('"Neophobia Review"');
    expect(prompt).toContain("Do NOT treat captured highlights as the full paper list");
    expect(prompt).toContain("RELATED PAPER EXCERPTS");
  });

  it("omits related papers when includeSavedPapers is false", () => {
    const project = { id: "p", name: "P", description: null };
    const bundle = buildProjectContextBundle(project, [], [], "chat", [makeSavedPaper()]);
    const prompt = formatProjectContextForPrompt(bundle, { includeSavedPapers: false });
    expect(prompt).not.toContain("RELATED PAPERS (inventory");
    expect(prompt).not.toContain("RELATED PAPER EXCERPTS");
  });
});
