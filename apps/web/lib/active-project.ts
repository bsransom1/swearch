import type { SupabaseClient } from "@supabase/supabase-js";

export async function setActiveProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  const { error: rpcError } = await supabase.rpc("set_active_project", {
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
