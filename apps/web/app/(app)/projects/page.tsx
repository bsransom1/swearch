import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import ProjectCreateButton from "@/components/projects/project-create-button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("research_projects")
    .select("*, papers_analyzed(count)")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false });

  const projectIds = (projects || []).map((p) => p.id);
  const { data: allLinkedDocs } = projectIds.length
    ? await supabase
        .from("project_google_docs")
        .select("project_id")
        .in("project_id", projectIds)
    : { data: [] as { project_id: string }[] };

  const docCountByProject = (allLinkedDocs || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.project_id] = (acc[row.project_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
          <p className="text-text-tertiary text-sm mt-1">
            Manage your research projects and linked Google Docs.
          </p>
        </div>
        <ProjectCreateButton />
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-3">
          {projects.map((project: any) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-surface-1 border border-border-subtle hover:border-border-default rounded-xl p-5 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors">
                      {project.name}
                    </h3>
                    {project.is_active && (
                      <span className="px-1.5 py-0.5 bg-accent-muted border border-accent rounded text-xs text-indigo-300">
                        Active
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-text-secondary text-sm mt-1 line-clamp-1">
                      {project.description}
                    </p>
                  )}
                  {(docCountByProject[project.id] ?? 0) > 0 && (
                    <p className="text-text-tertiary text-xs mt-1.5">
                      📄 {docCountByProject[project.id]} linked doc
                      {docCountByProject[project.id] === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-lg font-semibold text-text-primary">
                    {(project.papers_analyzed as any)?.[0]?.count ?? 0}
                  </p>
                  <p className="text-xs text-text-tertiary">papers</p>
                </div>
              </div>
              <p className="text-xs text-text-tertiary mt-3">
                Updated {formatRelativeDate(project.updated_at)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-12 text-center">
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
