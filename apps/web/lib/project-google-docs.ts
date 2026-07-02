import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findExportDoc,
  isContextRole,
  type ProjectGoogleDoc,
  type ProjectGoogleDocRole,
} from "@swearch/shared/types/project-google-doc";
import { CONTEXT_LIMITS } from "@swearch/shared/constants/context-limits";

type AppSupabase = SupabaseClient;

export async function fetchProjectGoogleDocs(
  supabase: AppSupabase,
  projectId: string
): Promise<ProjectGoogleDoc[]> {
  const { data, error } = await supabase
    .from("project_google_docs")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ProjectGoogleDoc[]) || [];
}

export async function linkProjectGoogleDoc(
  supabase: AppSupabase,
  params: {
    projectId: string;
    userId: string;
    googleDocId: string;
    title: string;
    role: ProjectGoogleDocRole;
    cachedText?: string | null;
    sortOrder?: number;
  }
): Promise<ProjectGoogleDoc> {
  if (isContextRole(params.role)) {
    const { count } = await supabase
      .from("project_google_docs")
      .select("id", { count: "exact", head: true })
      .eq("project_id", params.projectId)
      .in("role", ["context", "both"]);

    if ((count ?? 0) >= CONTEXT_LIMITS.maxContextDocsPerProject) {
      throw new Error(
        `This project already has ${CONTEXT_LIMITS.maxContextDocsPerProject} context documents. Remove one before adding another.`
      );
    }
  }

  const truncated = params.cachedText
    ? params.cachedText.slice(0, CONTEXT_LIMITS.maxCachedTextChars)
    : null;

  const { data, error } = await supabase
    .from("project_google_docs")
    .insert({
      project_id: params.projectId,
      user_id: params.userId,
      google_doc_id: params.googleDocId,
      title: params.title,
      role: params.role,
      cached_text: truncated || null,
      cached_at: truncated ? new Date().toISOString() : null,
      sort_order: params.sortOrder ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ProjectGoogleDoc;
}

export async function updateProjectGoogleDocRole(
  supabase: AppSupabase,
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

export async function removeProjectGoogleDoc(
  supabase: AppSupabase,
  docId: string
): Promise<void> {
  const { error } = await supabase.from("project_google_docs").delete().eq("id", docId);
  if (error) throw new Error(error.message);
}

export async function triggerDocSummary(
  supabase: AppSupabase,
  docId: string
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
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

export async function refreshProjectGoogleDocCache(
  supabase: AppSupabase,
  docId: string,
  googleDocId: string,
  readDocFn: () => Promise<string>
): Promise<void> {
  let cachedText = "";
  try {
    const raw = await readDocFn();
    cachedText = raw.slice(0, CONTEXT_LIMITS.maxCachedTextChars);
  } catch (e) {
    throw e;
  }

  const { error } = await supabase
    .from("project_google_docs")
    .update({
      cached_text: cachedText || null,
      cached_at: cachedText ? new Date().toISOString() : null,
    })
    .eq("id", docId);

  if (error) throw new Error(error.message);
}

export { findExportDoc };
