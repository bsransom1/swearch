import {
  buildDocumentContextEntries,
  buildLinkedDocInventory,
  formatDocumentsForPrompt,
  isContextRole,
  type LinkedDocInventoryItem,
  type ProjectDocumentContext,
  type ProjectGoogleDoc,
  type ProjectGoogleDocRole,
} from "./project-google-doc";
import { CONTEXT_LIMITS } from "../constants/context-limits";

export type ContextTask = "chat" | "analyze" | "ask" | "claims";

export interface HighlightContextItem {
  text: string;
  summary: string | null;
  paperTitle: string | null;
}

export interface SavedPaperContextItem {
  title: string;
  excerpt: string;
  url: string | null;
}

export interface SavedPaperInventoryItem {
  title: string;
  authors: string[] | null;
  year: number | null;
  hasContent: boolean;
}

export interface SavedPaperRow {
  recommended_title: string;
  recommended_authors: string[] | null;
  recommended_year: number | null;
  recommended_abstract: string | null;
  relevance_reason: string | null;
  recommended_url: string | null;
}

export interface ProjectContextBundle {
  project: { id: string; name: string; description: string | null };
  linkedDocs: LinkedDocInventoryItem[];
  documentContent: ProjectDocumentContext[];
  highlights: HighlightContextItem[];
  savedPaperInventory: SavedPaperInventoryItem[];
  savedPapers: SavedPaperContextItem[];
}

// ── Legacy alias kept for backward compat during migration ─────────────────────
export interface ProjectChatContext {
  name: string;
  description: string | null;
  documents: ProjectDocumentContext[];
  recentHighlights: string[];
}

function formatAuthorLabel(authors: string[] | null): string {
  if (!authors?.length) return "";
  const head = authors.slice(0, 2).join(", ");
  return authors.length > 2 ? `${head} et al.` : head;
}

// ── Builders ───────────────────────────────────────────────────────────────────

export function buildDocumentContent(
  docs: Pick<ProjectGoogleDoc, "title" | "role" | "cached_text" | "summary">[],
  budget?: { perDocChars?: number; totalChars?: number }
): ProjectDocumentContext[] {
  const perDocChars = budget?.perDocChars ?? CONTEXT_LIMITS.perDocSummaryChars;
  const totalChars = budget?.totalChars ?? CONTEXT_LIMITS.totalDocContentChars;
  let remaining = totalChars;
  const result: ProjectDocumentContext[] = [];

  // TODO Phase 3: when queryText provided, retrieve top-k chunks from project_doc_chunks
  for (const doc of docs.filter((d) => isContextRole(d.role))) {
    if (remaining <= 0) break;
    const source = doc.summary?.trim() || doc.cached_text?.trim() || "";
    if (!source) continue;
    const excerpt = source.slice(0, Math.min(perDocChars, remaining));
    result.push({ title: doc.title, excerpt });
    remaining -= excerpt.length;
  }

  return result;
}

export function buildHighlightContext(
  rows: { highlight_text: string; ai_summary: string | null; paperTitle: string | null }[],
  task: ContextTask
): HighlightContextItem[] {
  const maxCount = CONTEXT_LIMITS.maxHighlightsInPrompt[task] ?? CONTEXT_LIMITS.maxHighlightsInPrompt.chat;
  const maxEntryChars = CONTEXT_LIMITS.maxHighlightEntryChars;
  const totalChars = CONTEXT_LIMITS.totalHighlightChars;

  let remaining = totalChars;
  const result: HighlightContextItem[] = [];

  for (const row of rows.slice(0, maxCount)) {
    if (remaining <= 0) break;
    const text = (row.ai_summary ?? row.highlight_text).slice(0, maxEntryChars);
    if (!text) continue;
    result.push({
      text: text.slice(0, remaining),
      summary: row.ai_summary,
      paperTitle: row.paperTitle,
    });
    remaining -= text.length;
  }

  return result;
}

export function buildSavedPaperInventory(rows: SavedPaperRow[]): SavedPaperInventoryItem[] {
  return rows.slice(0, CONTEXT_LIMITS.maxSavedPapersInPrompt).map((row) => ({
    title: row.recommended_title,
    authors: row.recommended_authors,
    year: row.recommended_year,
    hasContent: !!(
      row.recommended_abstract?.trim() ||
      row.relevance_reason?.trim()
    ),
  }));
}

export function buildSavedPaperContext(rows: SavedPaperRow[]): SavedPaperContextItem[] {
  const maxCount = CONTEXT_LIMITS.maxSavedPapersInPrompt;
  const perPaper = CONTEXT_LIMITS.perPaperExcerptChars;
  const totalChars = CONTEXT_LIMITS.totalSavedPaperChars;
  let remaining = totalChars;
  const result: SavedPaperContextItem[] = [];

  for (const row of rows.slice(0, maxCount)) {
    if (remaining <= 0) break;
    const source =
      row.recommended_abstract?.trim() ||
      row.relevance_reason?.trim() ||
      "";
    if (!source) continue;
    const excerpt = source.slice(0, Math.min(perPaper, remaining));
    result.push({
      title: row.recommended_title,
      excerpt,
      url: row.recommended_url,
    });
    remaining -= excerpt.length;
  }

  return result;
}

export function buildProjectContextBundle(
  project: { id: string; name: string; description: string | null },
  docs: Pick<ProjectGoogleDoc, "title" | "role" | "cached_text" | "summary">[],
  highlights: { highlight_text: string; ai_summary: string | null; paperTitle: string | null }[],
  task: ContextTask,
  savedPaperRows: SavedPaperRow[] = []
): ProjectContextBundle {
  return {
    project,
    linkedDocs: buildLinkedDocInventory(docs),
    documentContent: buildDocumentContent(docs),
    highlights: buildHighlightContext(highlights, task),
    savedPaperInventory: buildSavedPaperInventory(savedPaperRows),
    savedPapers: buildSavedPaperContext(savedPaperRows),
  };
}

// ── Formatter ──────────────────────────────────────────────────────────────────

export function formatProjectContextForPrompt(
  bundle: ProjectContextBundle,
  options?: {
    includeDocContent?: boolean;
    includeHighlights?: boolean;
    includeSavedPapers?: boolean;
  }
): string {
  const {
    includeDocContent = true,
    includeHighlights = true,
    includeSavedPapers = true,
  } = options ?? {};
  const lines: string[] = [];

  lines.push(`ACTIVE PROJECT: "${bundle.project.name}"`);
  if (bundle.project.description) {
    lines.push(`Description: ${bundle.project.description}`);
  }

  if (bundle.linkedDocs.length > 0) {
    lines.push("\nLINKED DOCUMENTS (inventory):");
    bundle.linkedDocs.forEach((doc, i) => {
      const roleLabel = doc.role === "both" ? "Context + Export" : doc.role.charAt(0).toUpperCase() + doc.role.slice(1);
      const syncLabel = doc.synced ? "synced" : "not synced";
      lines.push(`${i + 1}. "${doc.title}" [${roleLabel}] — ${syncLabel}`);
    });
  }

  if (includeDocContent && bundle.documentContent.length > 0) {
    lines.push("\nDOCUMENT EXCERPTS (Context docs only):");
    bundle.documentContent.forEach((doc, i) => {
      lines.push(`${i + 1}. "${doc.title}"\n${doc.excerpt}`);
    });
  }

  if (includeHighlights && bundle.highlights.length > 0) {
    lines.push("\nCAPTURED HIGHLIGHTS (most relevant first):");
    bundle.highlights.forEach((h, i) => {
      const prefix = h.paperTitle ? `[${h.paperTitle}] ` : "";
      lines.push(`${i + 1}. ${prefix}${h.text}`);
    });
  }

  const inventory = bundle.savedPaperInventory ?? [];
  const excerpts = bundle.savedPapers ?? [];

  if (includeSavedPapers && inventory.length > 0) {
    lines.push("\nRELATED PAPERS (inventory — saved via Brain / Add to project):");
    inventory.forEach((p, i) => {
      const authors = formatAuthorLabel(p.authors);
      const meta = [authors, p.year ? String(p.year) : ""].filter(Boolean).join(" · ");
      const contentLabel = p.hasContent ? "has content" : "metadata only";
      lines.push(
        `${i + 1}. "${p.title}"${meta ? ` — ${meta}` : ""} — ${contentLabel}`
      );
    });
  }

  if (includeSavedPapers && excerpts.length > 0) {
    lines.push("\nRELATED PAPER EXCERPTS:");
    excerpts.forEach((p, i) => {
      lines.push(`${i + 1}. "${p.title}"\n${p.excerpt}`);
    });
  }

  const instructionLines = [
    "INSTRUCTIONS:",
    `- You have access to the project's linked documents${includeSavedPapers && inventory.length > 0 ? ", related papers (saved recommendations)," : ""} and captured highlights above.`,
    "- When asked about linked docs, use the LINKED DOCUMENTS inventory above.",
  ];

  if (includeSavedPapers && inventory.length > 0) {
    instructionLines.push(
      "- When the user asks about related papers, saved papers, papers in the project, or papers in the project database, list EVERY item in RELATED PAPERS (inventory). Do NOT treat captured highlights as the full paper list.",
      "- Highlights = papers the user read and annotated on the web. Related papers = Brain-discovered papers saved to the project via Add to project.",
      "- Use RELATED PAPER EXCERPTS (plus document excerpts and highlights) for synthesis questions such as themes or comparisons across sources.",
      "- If a related paper is metadata only, still list it by title and note that only a short saved blurb is available."
    );
  }

  instructionLines.push(
    "- If a doc is listed as \"not synced\", say it's linked but content isn't available yet — do NOT claim you cannot access Google Docs.",
    "- Ground answers in provided context; say plainly when context is insufficient."
  );

  lines.push("\n" + instructionLines.join("\n"));

  return lines.join("\n");
}

// ── Legacy helpers (kept for backward compat) ──────────────────────────────────
export function formatProjectDocumentsSection(documents: ProjectDocumentContext[]): string {
  if (documents.length === 0) return "";
  return `\nLinked documents:\n${formatDocumentsForPrompt(documents)}`;
}

export { buildDocumentContextEntries, buildLinkedDocInventory, formatDocumentsForPrompt };
export type { LinkedDocInventoryItem, ProjectDocumentContext, ProjectGoogleDocRole };
