import { supabase } from "./supabase";
import { storage } from "./storage";
import { syncProjectStorageFromDocs } from "./project-google-docs";

export interface ActiveProjectRecord {
  id: string;
  name: string;
  description?: string | null;
}

async function fetchProjectById(projectId: string): Promise<ActiveProjectRecord | null> {
  const { data } = await supabase
    .from("research_projects")
    .select("id, name, description")
    .eq("id", projectId)
    .maybeSingle();

  return data;
}

async function fetchActiveProjectFromDb(): Promise<ActiveProjectRecord | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("research_projects")
    .select("id, name, description")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return data;
}

async function persistActiveProjectToDb(projectId: string): Promise<void> {
  const { error: rpcError } = await (supabase.rpc as any)("set_active_project", {
    project_id: projectId,
  });
  if (!rpcError) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error: deactivateError } = await supabase
    .from("research_projects")
    .update({ is_active: false })
    .eq("user_id", user.id);

  if (deactivateError) throw new Error(deactivateError.message);

  const { error: activateError } = await supabase
    .from("research_projects")
    .update({ is_active: true })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (activateError) throw new Error(activateError.message);
}

/** Resolve the active project id: local storage first, then DB, syncing storage when needed. */
export async function getActiveProjectId(): Promise<string | null> {
  const stored = await storage.get(["currentProjectId"]);
  if (stored.currentProjectId) {
    const project = await fetchProjectById(stored.currentProjectId);
    if (project) return project.id;

    await storage.remove([
      "currentProjectId",
      "currentProjectName",
      "currentProjectDocId",
      "currentProjectContext",
      "currentProjectContextAt",
    ]);
  }

  const fromDb = await fetchActiveProjectFromDb();
  if (fromDb) {
    await syncProjectStorageFromDocs(fromDb.id, fromDb.name);
    return fromDb.id;
  }

  return null;
}

export async function getActiveProject(): Promise<ActiveProjectRecord | null> {
  const projectId = await getActiveProjectId();
  if (!projectId) return null;
  return fetchProjectById(projectId);
}

/** Mark a project active in the DB and sync linked-doc metadata into extension storage. */
export async function setActiveProject(projectId: string): Promise<ActiveProjectRecord> {
  await persistActiveProjectToDb(projectId);

  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  await syncProjectStorageFromDocs(project.id, project.name);
  return project;
}

/** Ensure chrome.storage reflects the user's last active project (call on startup / sign-in). */
export async function restoreActiveProject(): Promise<void> {
  await getActiveProjectId();
}
