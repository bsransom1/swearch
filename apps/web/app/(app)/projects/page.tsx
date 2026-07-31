import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import ProjectCreateButton from "@/components/projects/project-create-button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("research_projects")
    .select("*, papers_analyzed(count), highlights(count)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const projectIds = (projects || []).map((p) => p.id);
  const { data: allLinkedDocs } = projectIds.length
    ? await supabase
        .from("project_google_docs")
        .select("project_id, title")
        .in("project_id", projectIds)
        .order("sort_order", { ascending: true })
    : { data: [] as { project_id: string; title: string }[] };

  const docsByProject = (allLinkedDocs || []).reduce<Record<string, string[]>>((acc, row) => {
    if (!acc[row.project_id]) acc[row.project_id] = [];
    acc[row.project_id].push(row.title);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-text-primary">Projects</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your research projects.</p>
        </div>
        <ProjectCreateButton />
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((project: any) => {
            const paperCount =
              (project.papers_analyzed as { count: number }[])?.[0]?.count ?? 0;
            const highlightCount =
              (project.highlights as { count: number }[])?.[0]?.count ?? 0;
            const docTitles = docsByProject[project.id] ?? [];
            const docLabel =
              docTitles.length === 0
                ? null
                : docTitles.length === 1
                  ? docTitles[0]
                  : "Multiple docs";

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-surface-0 border border-border-default rounded-lg shadow-tier-2 hover:shadow-tier-3 p-4 transition-all duration-150 ease-out cursor-pointer group"
              >
                <h3 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors duration-150">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-text-secondary text-sm mt-1 line-clamp-1">
                    {project.description}
                  </p>
                )}
                {docLabel && (
                  <p className="flex items-center gap-1.5 text-text-secondary text-xs mt-2">
                    <FileText size={12} strokeWidth={2} className="flex-shrink-0" />
                    <span className="truncate">{docLabel}</span>
                  </p>
                )}
                <p className="text-text-tertiary text-xs mt-3">
                  {paperCount} paper{paperCount === 1 ? "" : "s"} · {highlightCount} highlight
                  {highlightCount === 1 ? "" : "s"} · Last activity{" "}
                  {formatRelativeDate(project.updated_at)}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-0 border border-border-default rounded-lg shadow-tier-2 p-12 text-center">
          <p className="text-text-primary font-medium">No projects yet</p>
          <p className="text-text-tertiary text-sm mt-1">
            Create your first project to start organizing your research.
          </p>
          <ProjectCreateButton className="mt-4 mx-auto" />
        </div>
      )}
    </div>
  );
}
