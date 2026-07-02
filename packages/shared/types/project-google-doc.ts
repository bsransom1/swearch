export type ProjectGoogleDocRole = "context" | "export" | "both";

export interface ProjectGoogleDoc {
  id: string;
  project_id: string;
  user_id: string;
  google_doc_id: string;
  title: string;
  cached_text: string | null;
  cached_at: string | null;
  summary: string | null;
  summary_at: string | null;
  role: ProjectGoogleDocRole;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface LinkedDocInventoryItem {
  title: string;
  role: ProjectGoogleDocRole;
  synced: boolean;
}

export function buildLinkedDocInventory(
  docs: Pick<ProjectGoogleDoc, "title" | "role" | "cached_text" | "summary">[]
): LinkedDocInventoryItem[] {
  return docs.map((doc) => ({
    title: doc.title,
    role: doc.role,
    synced: !!(doc.summary?.trim() || doc.cached_text?.trim()),
  }));
}

export interface ProjectDocumentContext {
  title: string;
  excerpt: string;
}

export function isContextRole(role: ProjectGoogleDocRole): boolean {
  return role === "context" || role === "both";
}

export function isExportRole(role: ProjectGoogleDocRole): boolean {
  return role === "export" || role === "both";
}

export function roleBadges(role: ProjectGoogleDocRole): ("Context" | "Export")[] {
  if (role === "both") return ["Context", "Export"];
  if (role === "context") return ["Context"];
  return ["Export"];
}

export function buildDocumentContextEntries(
  docs: Pick<ProjectGoogleDoc, "title" | "cached_text" | "summary" | "role">[],
  options?: { perDocLimit?: number; totalLimit?: number }
): ProjectDocumentContext[] {
  const perDocLimit = options?.perDocLimit ?? 500;
  const totalLimit = options?.totalLimit ?? 3000;
  let remaining = totalLimit;
  const result: ProjectDocumentContext[] = [];

  for (const doc of docs.filter((d) => isContextRole(d.role))) {
    if (remaining <= 0) break;
    const text = doc.summary?.trim() || doc.cached_text?.trim() || "";
    if (!text) continue;
    const excerpt = text.slice(0, Math.min(perDocLimit, remaining));
    result.push({ title: doc.title, excerpt });
    remaining -= excerpt.length;
  }

  return result;
}

export function formatDocumentsForPrompt(documents: ProjectDocumentContext[]): string {
  if (documents.length === 0) return "";
  return documents
    .map((d, i) => `${i + 1}. "${d.title}"\n${d.excerpt}`)
    .join("\n\n");
}

export function findExportDocs(
  docs: Pick<ProjectGoogleDoc, "google_doc_id" | "role">[]
): string[] {
  return docs.filter((d) => isExportRole(d.role)).map((d) => d.google_doc_id);
}

/** Default export target: first export-capable doc by list order. */
export function findExportDoc(
  docs: Pick<ProjectGoogleDoc, "google_doc_id" | "role">[]
): string | null {
  return findExportDocs(docs)[0] ?? null;
}
