"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function ProjectCreateButton({ className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error: insertError } = await supabase
      .from("research_projects")
      .insert({
        user_id: user!.id,
        name: trimmedName.slice(0, 100),
        description: description.trim().slice(0, 500) || null,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not create project");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setOpen(false);
    setName("");
    setDescription("");
    router.push(`/projects/${data.id}`);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "px-4 py-2 bg-accent hover:bg-accent-hover rounded-md text-sm font-medium text-white transition-colors duration-150 ease-out shadow-btn-primary",
          className
        )}
      >
        + New Project
      </button>

      {success && (
        <span className="sr-only" role="status">
          Project created
        </span>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-text-primary/30 flex items-center justify-center z-50 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-surface-0 border border-border-default rounded-xl p-6 w-full max-w-md shadow-tier-3">
            <h2 className="text-base font-semibold text-text-primary mb-4">New Project</h2>

            <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-text-tertiary block mb-1.5">Project name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 100))}
                  required
                  autoFocus
                  placeholder="e.g. Invasive species management"
                  className="w-full px-3 py-2.5 bg-surface-0 border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-50"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1.5">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Brief description of this research"
                  className="w-full px-3 py-2.5 bg-surface-0 border border-border-subtle rounded-md text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-50"
                />
              </div>

              {error && (
                <p className="text-sm text-error bg-error-50 border border-error/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-md text-sm font-medium text-white transition-colors"
                >
                  {loading ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
