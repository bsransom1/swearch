import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: activeProject }, { data: recentHighlights }, { data: stats }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase
        .from("research_projects")
        .select("*, papers_analyzed(count)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .single(),
      supabase
        .from("highlights")
        .select("*, papers_analyzed(paper_title, paper_url), research_projects(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("highlights")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  const firstName = profile?.full_name?.split(" ")[0] || "Researcher";

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          Good to see you, {firstName}
        </h1>
        <p className="text-text-tertiary text-sm mt-1">
          Here's what's happening with your research.
        </p>
      </div>

      {/* Active project */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
          Active Project
        </h2>
        {activeProject ? (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  {activeProject.name}
                </h3>
                {activeProject.description && (
                  <p className="text-text-secondary text-sm mt-1">
                    {activeProject.description}
                  </p>
                )}
                {activeProject.google_doc_title && (
                  <p className="text-text-tertiary text-xs mt-2">
                    📄 {activeProject.google_doc_title}
                  </p>
                )}
              </div>
              <Link
                href={`/projects/${activeProject.id}`}
                className="text-xs text-accent hover:underline"
              >
                View →
              </Link>
            </div>
            <div className="mt-4 flex gap-6">
              <div>
                <p className="text-xl font-semibold text-text-primary">
                  {(activeProject.papers_analyzed as any)?.[0]?.count ?? 0}
                </p>
                <p className="text-xs text-text-tertiary">Papers analyzed</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-text-primary">
                  {stats?.count ?? 0}
                </p>
                <p className="text-xs text-text-tertiary">Highlights this week</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-5 text-center">
            <p className="text-text-secondary text-sm">No active project.</p>
            <Link
              href="/projects"
              className="text-accent text-sm hover:underline mt-1 inline-block"
            >
              Create or select a project →
            </Link>
          </div>
        )}
      </section>

      {/* Recent highlights */}
      <section>
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
          Recent Highlights
        </h2>
        {recentHighlights && recentHighlights.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recentHighlights.map((h: any) => (
              <div
                key={h.id}
                className="bg-surface-1 border border-border-subtle rounded-xl p-4"
              >
                <p className="text-sm text-text-primary line-clamp-2">
                  "{h.highlight_text}"
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={h.papers_analyzed?.paper_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-text-tertiary hover:text-accent truncate max-w-xs"
                  >
                    {h.papers_analyzed?.paper_title || "Unknown paper"}
                  </a>
                  <span className="text-text-tertiary text-xs">·</span>
                  <span className="text-xs text-text-tertiary flex-shrink-0">
                    {formatRelativeDate(h.created_at)}
                  </span>
                  {h.research_projects?.name && (
                    <>
                      <span className="text-text-tertiary text-xs">·</span>
                      <span className="text-xs text-text-tertiary">
                        {h.research_projects.name}
                      </span>
                    </>
                  )}
                </div>
                {h.ai_summary && (
                  <p className="text-xs text-text-secondary mt-2 line-clamp-2">
                    {h.ai_summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-8 text-center">
            <p className="text-text-secondary text-sm">No highlights yet.</p>
            <p className="text-text-tertiary text-xs mt-1">
              Install the Chrome extension and highlight text on any research paper.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
