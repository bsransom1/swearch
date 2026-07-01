import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { storage } from "../../lib/storage";
import {
  connectGoogleDrive,
  isGoogleDriveConnected,
  listGoogleDocs,
  readGoogleDoc,
  type GoogleDocSummary,
} from "../../lib/google-docs";
import LinkedDocCard from "../components/LinkedDocCard";
import GoogleDocPicker from "../components/GoogleDocPicker";
import { BTN_PRIMARY } from "../../lib/theme";

interface Props {
  onBack: () => void;
}

function docFromProject(id: string, title: string): GoogleDocSummary {
  return {
    id,
    name: title,
    modifiedTime: new Date(0).toISOString(),
  };
}

export default function SettingsView({ onBack }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [googleDocs, setGoogleDocs] = useState<GoogleDocSummary[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);
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
      const projectId = stored.currentProjectId || data?.[0]?.id || "";
      setSelectedProjectId(projectId);

      const activeProject = data?.find((p) => p.id === projectId);
      const docId = stored.currentProjectDocId || activeProject?.google_doc_id || "";
      setSelectedDocId(docId);

      if (activeProject?.google_doc_id && activeProject.google_doc_title) {
        setGoogleDocs([
          docFromProject(activeProject.google_doc_id, activeProject.google_doc_title),
        ]);
      }

      setDriveConnected(await isGoogleDriveConnected());
    }
    load();
  }, []);

  const loadGoogleDocs = useCallback(async () => {
    setLoadingDocs(true);
    setDocsError(null);
    try {
      if (!driveConnected) {
        await connectGoogleDrive();
        setDriveConnected(true);
      }
      const docs = await listGoogleDocs();
      setGoogleDocs(docs);
      setDocsLoaded(true);
      if (docs.length === 0) {
        setDocsError("No Google Docs found in your Drive.");
      }
    } catch (e: any) {
      setDocsError(e.message || "Failed to load Google Docs.");
      setDriveConnected(false);
    } finally {
      setLoadingDocs(false);
    }
  }, [driveConnected]);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setDocsError(null);
    if (!docsLoaded || googleDocs.length <= 1) {
      await loadGoogleDocs();
    }
  }, [docsLoaded, googleDocs.length, loadGoogleDocs]);

  async function handleConnectDrive() {
    setConnectingDrive(true);
    setDocsError(null);
    try {
      await connectGoogleDrive();
      setDriveConnected(true);
    } catch (e: any) {
      setDocsError(e.message || "Failed to connect Google Drive");
      setDriveConnected(false);
    } finally {
      setConnectingDrive(false);
    }
  }

  function handleSelectDoc(docId: string) {
    setSelectedDocId(docId);
    setPickerOpen(false);
    setDocsError(null);
  }

  async function handleSave() {
    setSaving(true);
    setDocsError(null);
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) {
      setSaving(false);
      return;
    }

    const selectedDoc = googleDocs.find((d) => d.id === selectedDocId);

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

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const selectedDoc = useMemo((): GoogleDocSummary | null => {
    if (!selectedDocId) return null;
    const fromList = googleDocs.find((d) => d.id === selectedDocId);
    if (fromList) return fromList;
    if (selectedProject?.google_doc_id === selectedDocId && selectedProject.google_doc_title) {
      return docFromProject(selectedDocId, selectedProject.google_doc_title);
    }
    return null;
  }, [selectedDocId, googleDocs, selectedProject]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-text-primary">Settings</span>
      </div>

      <div className="bg-surface-1 border border-border-subtle rounded-lg p-3">
        <p className="text-xs font-medium text-text-primary mb-1">Google Drive access</p>
        <p className="text-xs text-text-tertiary mb-2">
          Export uses the Chrome extension OAuth client, not your Swearch login. Connect
          once to grant Drive + Docs access.
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs ${driveConnected ? "text-green-400" : "text-text-tertiary"}`}>
            {driveConnected ? "✓ Connected" : "Not connected"}
          </span>
          <button
            onClick={handleConnectDrive}
            disabled={connectingDrive}
            className="px-3 py-1.5 bg-surface-2 hover:bg-surface-1 border border-border-subtle rounded-lg text-xs text-text-secondary disabled:opacity-50 transition-colors"
          >
            {connectingDrive ? "Connecting..." : driveConnected ? "Reconnect" : "Connect Google Drive"}
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-text-tertiary block mb-1.5">Active project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedProjectId(id);
            setPickerOpen(false);
            const project = projects.find((p) => p.id === id);
            if (project?.google_doc_id) {
              setSelectedDocId(project.google_doc_id);
              if (project.google_doc_title) {
                setGoogleDocs((prev) => {
                  const existing = prev.find((d) => d.id === project.google_doc_id);
                  if (existing) return prev;
                  return [
                    docFromProject(project.google_doc_id, project.google_doc_title),
                    ...prev,
                  ];
                });
              }
            } else {
              setSelectedDocId("");
            }
          }}
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
            Create a project in the web app first.
          </p>
        )}
      </div>

      <div>
        <label className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary block mb-1.5">
          Linked Google Doc
        </label>

        {docsError && !pickerOpen && (
          <p className="text-xs text-error mb-2 bg-error-50 border border-error/30 rounded-lg px-3 py-2">
            {docsError}
          </p>
        )}

        {pickerOpen ? (
          <GoogleDocPicker
            docs={googleDocs}
            selectedDocId={selectedDocId}
            loading={loadingDocs}
            error={pickerOpen ? docsError : null}
            onSelect={handleSelectDoc}
            onRefresh={loadGoogleDocs}
            onClose={() => setPickerOpen(false)}
          />
        ) : selectedDoc ? (
          <LinkedDocCard doc={selectedDoc} onChange={openPicker} />
        ) : (
          <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 text-center">
            <p className="text-xs text-text-secondary mb-1">No document linked</p>
            <p className="text-[11px] text-text-tertiary mb-3">
              Choose where highlights export in Google Docs.
            </p>
            <button
              type="button"
              onClick={openPicker}
              disabled={loadingDocs}
              className="w-full py-2 bg-surface-2 hover:bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-primary disabled:opacity-50 transition-colors"
            >
              {loadingDocs ? "Loading..." : "Browse documents"}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !selectedProjectId}
        className={`w-full ${BTN_PRIMARY}`}
      >
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save settings"}
      </button>
    </div>
  );
}
