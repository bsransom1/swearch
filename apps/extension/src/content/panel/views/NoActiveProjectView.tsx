import { useEffect, useState } from "react";
import { bridge, type Project } from "../lib/bridge";

interface Props {
  onProjectSet: () => void;
}

export default function NoActiveProjectView({ onProjectSet }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [setting, setSettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bridge
      .getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(id: string) {
    setSettingId(id);
    setError(null);
    try {
      await bridge.setActiveProject(id);
      onProjectSet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set project");
      setSettingId(null);
    }
  }

  const webAppUrl =
    (typeof chrome !== "undefined" &&
      chrome.runtime
        .getManifest()
        // @ts-ignore
        ?.externally_connectable?.matches?.[0]?.replace("/*", "")) ||
    "https://swearch.app";

  return (
    <div className="p-4 space-y-3">
      <div className="bg-surface-2 border border-border-subtle rounded-lg p-3">
        <p className="text-xs text-text-secondary">
          You don't have an active project set. Choose one to continue.
        </p>
      </div>

      {error && (
        <p className="text-xs text-error">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-tertiary">Loading projects…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-text-tertiary mb-2">
            You don't have any projects yet.
          </p>
          <a
            href={`${webAppUrl}/projects`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline"
          >
            Create one in the Swearch dashboard ↗
          </a>
        </div>
      ) : (
        <div className="space-y-1.5">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p.id)}
              disabled={setting === p.id}
              className="w-full text-left px-3 py-2 bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg transition-colors disabled:opacity-60"
            >
              <p className="text-sm font-medium text-text-primary">{p.name}</p>
              {p.description && (
                <p className="text-xs text-text-tertiary truncate mt-0.5">
                  {p.description}
                </p>
              )}
              {setting === p.id && (
                <p className="text-xs text-accent mt-0.5">Setting…</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
