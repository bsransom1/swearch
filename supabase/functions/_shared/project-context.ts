/**
 * Shared project context types + formatters for Swearch edge functions.
 * This file is a Deno-compatible duplicate of packages/shared/types/project-chat-context.ts.
 * It cannot import from the workspace package; keep in sync manually.
 */

export type ProjectGoogleDocRole = "context" | "export" | "both";
export type ContextTask = "chat" | "analyze" | "ask" | "claims";

export interface LinkedDocInventoryItem {
  title: string;
  role: ProjectGoogleDocRole;
  synced: boolean;
}

export interface ProjectDocumentContext {
  title: string;
  excerpt: string;
}

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

export interface ProjectContextBundle {
  project: { id: string; name: string; description: string | null };
  linkedDocs: LinkedDocInventoryItem[];
  documentContent: ProjectDocumentContext[];
  highlights: HighlightContextItem[];
  savedPaperInventory: SavedPaperInventoryItem[];
  savedPapers: SavedPaperContextItem[];
}

const CONTEXT_LIMITS = {
  maxSavedPapersInPrompt: 10,
  perPaperExcerptChars: 400,
  totalSavedPaperChars: 3000,
  maxHighlightsInPrompt: { chat: 15, analyze: 10, ask: 8, claims: 3 } as Record<string, number>,
};

function formatAuthorLabel(authors: string[] | null): string {
  if (!authors?.length) return "";
  const head = authors.slice(0, 2).join(", ");
  return authors.length > 2 ? `${head} et al.` : head;
}

export function isContextRole(role: ProjectGoogleDocRole): boolean {
  return role === "context" || role === "both";
}

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
      const roleLabel =
        doc.role === "both"
          ? "Context + Export"
          : doc.role.charAt(0).toUpperCase() + doc.role.slice(1);
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

/** Build a light bundle for claims_only mode: inventory + N highlights, no doc body. */
export function buildLightBundle(
  bundle: ProjectContextBundle,
  task: ContextTask
): ProjectContextBundle {
  const maxCount = CONTEXT_LIMITS.maxHighlightsInPrompt[task] ?? 3;
  return {
    ...bundle,
    documentContent: [],
    highlights: bundle.highlights.slice(0, maxCount),
  };
}
