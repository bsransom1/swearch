import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { storage } from "../../lib/storage";
import { listGoogleDocs, readGoogleDoc } from "../../lib/google-docs";

interface Props {
  onBack: () => void;
}

export default function SettingsView({ onBack }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [googleDocs, setGoogleDocs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("research_projects")
        .select("id, name, google_doc_id, google_doc_title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setProjects(data || []);

      const stored = await storage.get(["currentProjectId", "currentProjectDocId"]);
      if (stored.currentProjectId) setSelectedProjectId(stored.currentProjectId);
      if (stored.currentProjectDocId) setSelectedDocId(stored.currentProjectDocId);
    }
    load();
  }, []);

  // TODO: Add Google Docs document picker UI in SettingsView (list user's docs, let them select)
  // This is a basic implementation — consider a searchable dropdown for users with many docs.
  async function loadGoogleDocs() {
    setLoadingDocs(true);
    setDocsError(null);
    try {
      const docs = await listGoogleDocs();
      setGoogleDocs(docs);
    } catch (e: any) {
      setDocsError(e.message || "Failed to load Google Docs. Make sure you grant access.");
    } finally {
      setLoadingDocs(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const selectedDoc = googleDocs.find((d) => d.id === selectedDocId);

    // Cache the Google Doc text for Claude context
    let docText = "";
    if (selectedDocId) {
      try {
        docText = await readGoogleDoc(selectedDocId);
      } catch (e) {
        console.warn("Could not read doc text for context:", e);
      }
    }

    await storage.set({
      currentProjectId: project.id,
      currentProjectName: project.name,
      currentProjectDocId: selectedDocId || project.google_doc_id || undefined,
      currentProjectContext: docText || undefined,
      currentProjectContextAt: Date.now(),
    });

    // Update project's linked doc in DB if changed
    if (selectedDocId && selectedDocId !== project.google_doc_id) {
      await supabase
        .from("research_projects")
        .update({
          google_doc_id: selectedDocId,
          google_doc_title: selectedDoc?.name,
          google_doc_cached_text: docText,
          google_doc_cached_at: new Date().toISOString(),
        })
        .eq("id", project.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-text-primary">Settings</span>
      </div>

      {/* Project selector */}
      <div>
        <label className="text-xs text-text-tertiary block mb-1.5">Active project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-3 py-2 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value="">Select a project...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {projects.length === 0 && (
          <p className="text-xs text-text-tertiary mt-1">
            Create a project at{" "}
            <a
              href="https://swearch.app/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              swearch.app
            </a>
          </p>
        )}
      </div>

      {/* Google Doc picker */}
      <div>
        <label className="text-xs text-text-tertiary block mb-1.5">
          Linked Google Doc
        </label>
        <button
          onClick={loadGoogleDocs}
          disabled={loadingDocs}
          className="w-full py-2 mb-2 bg-surface-1 hover:bg-surface-2 border border-border-subtle rounded-lg text-sm text-text-secondary disabled:opacity-50 transition-colors"
        >
          {loadingDocs ? "Loading docs..." : "Load my Google Docs"}
        </button>

        {docsError && (
          <p className="text-xs text-red-400 mb-2">{docsError}</p>
        )}

        {googleDocs.length > 0 && (
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full px-3 py-2 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="">No doc linked</option>
            {googleDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !selectedProjectId}
        className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        {saving ? "Saving..." : saved ? "✓ Saved" : "Save settings"}
      </button>
    </div>
  );
}
