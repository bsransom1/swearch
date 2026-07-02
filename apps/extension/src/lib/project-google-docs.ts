import { supabase } from "./supabase";
import { readGoogleDoc } from "./google-docs";
import {
  findExportDoc,
  isContextRole,
  type ProjectGoogleDoc,
  type ProjectGoogleDocRole,
} from "@swearch/shared/types/project-google-doc";
import { CONTEXT_LIMITS } from "@swearch/shared/constants/context-limits";

export type { ProjectGoogleDoc, ProjectGoogleDocRole };

export async function fetchProjectGoogleDocs(projectId: string): Promise<ProjectGoogleDoc[]> {
  const { data, error } = await supabase
    .from("project_google_docs")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ProjectGoogleDoc[]) || [];
}

export async function fetchExportDocId(projectId: string): Promise<string | null> {
  const docs = await fetchProjectGoogleDocs(projectId);
  return findExportDoc(docs);
}

async function countContextDocs(projectId: string): Promise<number> {
  const { count } = await supabase
    .from("project_google_docs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .in("role", ["context", "both"]);
  return count ?? 0;
}

export async function linkProjectGoogleDoc(params: {
  projectId: string;
  userId: string;
  googleDocId: string;
  title: string;
  role: ProjectGoogleDocRole;
  sortOrder?: number;
}): Promise<ProjectGoogleDoc> {
  if (isContextRole(params.role)) {
    const currentCount = await countContextDocs(params.projectId);
    if (currentCount >= CONTEXT_LIMITS.maxContextDocsPerProject) {
      throw new Error(
        `This project already has ${CONTEXT_LIMITS.maxContextDocsPerProject} context documents. Remove one before adding another.`
      );
    }
  }

  let cachedText = "";
  let cacheError: string | null = null;
  try {
    const raw = await readGoogleDoc(params.googleDocId);
    cachedText = raw.slice(0, CONTEXT_LIMITS.maxCachedTextChars);
  } catch (e: any) {
    cacheError = e?.message || "Failed to read Google Doc";
    console.warn("[Swearch] Could not cache doc text:", e);
  }

  if (isContextRole(params.role) && cacheError && !cachedText) {
    throw new Error(
      `Could not read document content: ${cacheError}. Make sure Google Drive is connected and the doc is accessible.`
    );
  }

  const { data, error } = await supabase
    .from("project_google_docs")
    .insert({
      project_id: params.projectId,
      user_id: params.userId,
      google_doc_id: params.googleDocId,
      title: params.title,
      role: params.role,
      cached_text: cachedText || null,
      cached_at: cachedText ? new Date().toISOString() : null,
      sort_order: params.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  const linked = data as ProjectGoogleDoc;

  if (cachedText && linked.id) {
    triggerDocSummary(linked.id).catch(() => {});
  }

  return linked;
}

export async function updateProjectGoogleDocRole(
  docId: string,
  projectId: string,
  newRole: ProjectGoogleDocRole
): Promise<ProjectGoogleDoc> {
  const { data, error } = await supabase
    .from("project_google_docs")
    .update({ role: newRole })
    .eq("id", docId)
    .eq("project_id", projectId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProjectGoogleDoc;
}

export async function removeProjectGoogleDoc(docId: string): Promise<void> {
  const { error } = await supabase.from("project_google_docs").delete().eq("id", docId);
  if (error) throw new Error(error.message);
}

export async function refreshProjectGoogleDocCache(docId: string): Promise<void> {
  const { data: row } = await supabase
    .from("project_google_docs")
    .select("google_doc_id")
    .eq("id", docId)
    .single();

  if (!row) return;

  let cachedText = "";
  try {
    const raw = await readGoogleDoc(row.google_doc_id);
    cachedText = raw.slice(0, CONTEXT_LIMITS.maxCachedTextChars);
  } catch (e) {
    console.warn("[Swearch] Could not refresh doc cache:", e);
    throw e;
  }

  const { data: updated } = await supabase
    .from("project_google_docs")
    .update({
      cached_text: cachedText || null,
      cached_at: cachedText ? new Date().toISOString() : null,
    })
    .eq("id", docId)
    .select("id")
    .single();

  if (updated && cachedText) {
    triggerDocSummary(docId).catch(() => {});
  }
}

export async function triggerDocSummary(docId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const supabaseUrl = (supabase as any).supabaseUrl as string;
  const url = `${supabaseUrl}/functions/v1/summarize-project-doc`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ docId }),
  }).catch((e) => console.warn("[Swearch] Summary generation failed:", e));
}

export async function syncProjectStorageFromDocs(
  projectId: string,
  projectName: string
): Promise<void> {
  const docs = await fetchProjectGoogleDocs(projectId);
  const exportDocId = findExportDoc(docs);

  const { storage } = await import("./storage");
  await storage.set({
    currentProjectId: projectId,
    currentProjectName: projectName,
    currentProjectDocId: exportDocId || undefined,
    currentProjectContextAt: Date.now(),
  });
}
