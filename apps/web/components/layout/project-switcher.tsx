"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setActiveProject } from "@/lib/active-project";

interface Project {
  id: string;
  name: string;
}

interface Props {
  activeProject: Project | null;
  projects: Project[];
}

export default function ProjectSwitcher({ activeProject, projects }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(activeProject);

  useEffect(() => {
    setCurrent(activeProject);
  }, [activeProject]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSwitch(projectId: string) {
    if (projectId === current?.id) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await setActiveProject(supabase, projectId);
      setCurrent(projects.find((p) => p.id === projectId) ?? null);
      setOpen(false);
      router.refresh();
    } catch (e) {
      console.error("[Swearch] Failed to switch project:", e);
    } finally {
      setBusy(false);
    }
  }

  const label = current?.name ?? "Select project";

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 w-full min-w-0 max-w-full pl-2 pr-1 py-1 rounded-full bg-surface-1 border border-border-subtle shadow-tier-2 hover:bg-surface-2 hover:border-border-default transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60"
        title="Change active project"
        aria-label={`Active project: ${label}. Click to change.`}
        aria-expanded={open}
      >
        <FolderOpen size={12} strokeWidth={2} className="text-accent flex-shrink-0" />
        <span className="text-xs text-text-secondary truncate min-w-0 flex-1 text-left">
          {label}
        </span>
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-surface-2 text-text-tertiary">
          <ChevronDown
            size={12}
            strokeWidth={2.5}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="swearch-popover-in absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-0 border border-border-default rounded-lg shadow-tier-1 max-h-48 overflow-y-auto">
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-tertiary">No projects yet.</p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void handleSwitch(p.id)}
                disabled={busy}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-1 transition-colors duration-150 disabled:opacity-60 ${
                  p.id === current?.id ? "text-accent font-medium" : "text-text-secondary"
                }`}
              >
                {p.name}
              </button>
            ))
          )}
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="block w-full px-3 py-2 text-xs text-accent border-t border-border-subtle hover:bg-surface-1 transition-colors text-center"
          >
            All projects →
          </Link>
        </div>
      )}
    </div>
  );
}
