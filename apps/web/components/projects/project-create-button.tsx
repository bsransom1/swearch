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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("research_projects").insert({
      user_id: user!.id,
      name: name.trim(),
      description: description.trim() || null,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setOpen(false);
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium text-white transition-colors",
          className
        )}
      >
        + New Project
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-surface-1 border border-border-default rounded-xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              New Project
            </h2>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-text-tertiary block mb-1.5">
                  Project name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="e.g. Attention Mechanisms in NLP"
                  className="w-full px-3 py-2.5 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary block mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this research project about?"
                  className="w-full px-3 py-2.5 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <p className="text-xs text-text-tertiary">
                💡 You can link a Google Doc from the extension Settings panel after creating the project.
              </p>

              {error && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
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
                  className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  {loading ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
