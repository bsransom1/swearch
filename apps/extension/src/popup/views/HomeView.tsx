import { useEffect, useState } from "react";
import { signOut } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { storage } from "../../lib/storage";

interface Props {
  user: any;
  onHighlight: () => void;
  onSettings: () => void;
}

export default function HomeView({ user, onHighlight, onSettings }: Props) {
  const [project, setProject] = useState<any>(null);
  const [recentHighlights, setRecentHighlights] = useState<any[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const stored = await storage.get(["currentProjectId", "currentProjectName", "currentProjectDocId"]);

      if (stored.currentProjectId) {
        const { data } = await supabase
          .from("research_projects")
          .select("*, papers_analyzed(count)")
          .eq("id", stored.currentProjectId)
          .single();
        setProject(data);

        const { data: highlights } = await supabase
          .from("highlights")
          .select("*, papers_analyzed(paper_title)")
          .eq("project_id", stored.currentProjectId)
          .order("created_at", { ascending: false })
          .limit(3);
        setRecentHighlights(highlights || []);
      }

      chrome.storage.local.get(["pendingHighlight"], (result) => {
        setHasPending(!!result.pendingHighlight);
      });

      setLoading(false);
    }
    load();
  }, []);

  async function handleSignOut() {
    await signOut();
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-sm font-semibold text-text-primary">Swearch</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSettings}
            className="text-text-tertiary hover:text-text-secondary text-xs transition-colors"
          >
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="text-text-tertiary hover:text-text-secondary text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {/* Pending highlight banner */}
        {hasPending && (
          <button
            onClick={onHighlight}
            className="w-full flex items-center gap-2 bg-accent-muted border border-accent rounded-lg px-3 py-2 text-left hover:bg-indigo-900 transition-colors"
          >
            <span className="text-lg">✨</span>
            <div>
              <p className="text-xs font-medium text-accent">Highlight ready to analyze</p>
              <p className="text-xs text-text-tertiary">Click to view and export</p>
            </div>
          </button>
        )}

        {/* Active project */}
        <div className="bg-surface-1 border border-border-subtle rounded-lg p-3">
          <p className="text-xs text-text-tertiary mb-1">Active project</p>
          {loading ? (
            <div className="h-4 bg-surface-2 rounded animate-pulse w-32" />
          ) : project ? (
            <>
              <p className="text-sm font-medium text-text-primary">{project.name}</p>
              {project.google_doc_title && (
                <p className="text-xs text-text-tertiary mt-0.5 truncate">
                  📄 {project.google_doc_title}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-text-secondary">
              No project selected —{" "}
              <button onClick={onSettings} className="text-accent underline">
                set one in Settings
              </button>
            </p>
          )}
        </div>

        {/* Recent highlights */}
        {recentHighlights.length > 0 && (
          <div>
            <p className="text-xs text-text-tertiary mb-2">Recent highlights</p>
            <div className="flex flex-col gap-1.5">
              {recentHighlights.map((h) => (
                <div
                  key={h.id}
                  className="bg-surface-1 border border-border-subtle rounded-lg p-2"
                >
                  <p className="text-xs text-text-primary line-clamp-2">
                    "{h.highlight_text}"
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5 truncate">
                    {h.papers_analyzed?.paper_title || "Unknown paper"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasPending && recentHighlights.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-text-tertiary">
              Highlight text on any research paper to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
