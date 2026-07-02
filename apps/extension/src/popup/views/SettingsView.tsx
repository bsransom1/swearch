import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  getActiveProjectId,
  setActiveProject as persistActiveProject,
} from "../../lib/active-project";
import {
  connectGoogleDrive,
  isGoogleDriveConnected,
  listGoogleDocs,
  type GoogleDocSummary,
} from "../../lib/google-docs";
import {
  fetchProjectGoogleDocs,
  linkProjectGoogleDoc,
  refreshProjectGoogleDocCache,
  removeProjectGoogleDoc,
  syncProjectStorageFromDocs,
  updateProjectGoogleDocRole,
  type ProjectGoogleDoc,
} from "../../lib/project-google-docs";
import type { ProjectGoogleDocRole } from "@swearch/shared/types/project-google-doc";
import GoogleDocPicker from "../components/GoogleDocPicker";
import DocRoleChooser from "../components/DocRoleChooser";
import GoogleDriveIcon from "../components/GoogleDriveIcon";
import LinkedProjectDocCard from "../components/LinkedProjectDocCard";
import LinkedProjectPaperCard from "../components/LinkedProjectPaperCard";
import {
  fetchProjectPaperRecommendations,
  removeProjectPaperRecommendation,
} from "../../lib/project-papers";
import type { PaperRecommendation } from "@swearch/shared";
import { BTN_SECONDARY } from "../../lib/theme";

interface Props {
  onBack: () => void;
}

type FlowStep = "list" | "picker" | "choose-role";

export default function SettingsView({ onBack }: Props) {
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [linkedDocs, setLinkedDocs] = useState<ProjectGoogleDoc[]>([]);
  const [savedPapers, setSavedPapers] = useState<PaperRecommendation[]>([]);
  const [googleDocs, setGoogleDocs] = useState<GoogleDocSummary[]>([]);
  const [flowStep, setFlowStep] = useState<FlowStep>("list");
  const [pendingDoc, setPendingDoc] = useState<GoogleDocSummary | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<ProjectGoogleDoc | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [docActionBusy, setDocActionBusy] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const loadLinkedDocs = useCallback(async (projectId: string) => {
    if (!projectId) {
      setLinkedDocs([]);
      setSavedPapers([]);
      return;
    }
    try {
      const [docs, papers] = await Promise.all([
        fetchProjectGoogleDocs(projectId),
        fetchProjectPaperRecommendations(projectId),
      ]);
      setLinkedDocs(docs);
      setSavedPapers(papers);
    } catch (e: any) {
      setDocsError(e.message || "Failed to load linked documents.");
    }
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("research_projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setProjects(data || []);

      const projectId = (await getActiveProjectId()) || data?.[0]?.id || "";
      setSelectedProjectId(projectId);
      await loadLinkedDocs(projectId);
      const project = (data || []).find((p) => p.id === projectId);
      if (project) {
        await syncProjectStorageFromDocs(project.id, project.name);
      }
      setDriveConnected(await isGoogleDriveConnected());
    }
    load();
  }, [loadLinkedDocs]);

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
    setFlowStep("picker");
    setPendingDoc(null);
    setRoleChangeTarget(null);
    setDocsError(null);
    if (!docsLoaded) {
      await loadGoogleDocs();
    }
  }, [docsLoaded, loadGoogleDocs]);

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

  async function handleProjectChange(projectId: string) {
    setSelectedProjectId(projectId);
    setFlowStep("list");
    setPendingDoc(null);
    setRoleChangeTarget(null);
    await loadLinkedDocs(projectId);

    if (projectId) {
      try {
        await persistActiveProject(projectId);
        chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
      } catch (e: any) {
        setDocsError(e.message || "Failed to set active project.");
      }
    }
  }

  const linkedGoogleDocIds = useMemo(
    () => new Set(linkedDocs.map((d) => d.google_doc_id)),
    [linkedDocs]
  );

  const pickerDocs = useMemo(
    () => googleDocs.filter((d) => !linkedGoogleDocIds.has(d.id)),
    [googleDocs, linkedGoogleDocIds]
  );

  const showBothOption = roleChangeTarget
    ? linkedDocs.length === 1
    : linkedDocs.length === 0;

  async function updateDocRole(doc: ProjectGoogleDoc, role: ProjectGoogleDocRole) {
    if (role === doc.role) return;

    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    setDocActionBusy(true);
    setDocsError(null);

    try {
      await updateProjectGoogleDocRole(doc.id, project.id, role);
      await loadLinkedDocs(project.id);
      await syncProjectStorageFromDocs(project.id, project.name);
      chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
    } catch (e: any) {
      setDocsError(e.message || "Failed to update document role.");
    } finally {
      setDocActionBusy(false);
    }
  }

  async function applyDocRole(role: ProjectGoogleDocRole) {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setDocActionBusy(true);
    setDocsError(null);

    try {
      if (roleChangeTarget) {
        await updateProjectGoogleDocRole(roleChangeTarget.id, project.id, role);
      } else if (pendingDoc) {
        await linkProjectGoogleDoc({
          projectId: project.id,
          userId: user.id,
          googleDocId: pendingDoc.id,
          title: pendingDoc.name,
          role,
          sortOrder: linkedDocs.length,
        });
      }

      await loadLinkedDocs(project.id);
      await syncProjectStorageFromDocs(project.id, project.name);
      chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
      setFlowStep("list");
      setPendingDoc(null);
      setRoleChangeTarget(null);
    } catch (e: any) {
      setDocsError(e.message || "Failed to save document.");
    } finally {
      setDocActionBusy(false);
    }
  }

  function handlePickerSelect(docId: string) {
    const doc = googleDocs.find((d) => d.id === docId);
    if (!doc) return;
    setPendingDoc(doc);
    setRoleChangeTarget(null);
    setFlowStep("choose-role");
  }

  async function handleSyncDoc(doc: ProjectGoogleDoc) {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;
    setDocActionBusy(true);
    setDocsError(null);
    try {
      await refreshProjectGoogleDocCache(doc.id);
      await loadLinkedDocs(project.id);
      await syncProjectStorageFromDocs(project.id, project.name);
    } catch (e: any) {
      setDocsError(e.message || "Failed to sync document.");
    } finally {
      setDocActionBusy(false);
    }
  }

  async function handleRemoveDoc(doc: ProjectGoogleDoc) {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const confirmed = window.confirm(`Remove "${doc.title}" from this project?`);
    if (!confirmed) return;

    setDocActionBusy(true);
    setDocsError(null);
    try {
      await removeProjectGoogleDoc(doc.id);
      await loadLinkedDocs(project.id);
      await syncProjectStorageFromDocs(project.id, project.name);
      chrome.runtime.sendMessage({ type: "SWEARCH_PROJECT_CHANGED" }).catch(() => {});
    } catch (e: any) {
      setDocsError(e.message || "Failed to remove document.");
    } finally {
      setDocActionBusy(false);
    }
  }

  async function handleRemovePaper(paper: PaperRecommendation) {
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;

    const confirmed = window.confirm(`Remove "${paper.recommended_title}" from this project?`);
    if (!confirmed) return;

    setDocActionBusy(true);
    setDocsError(null);
    try {
      await removeProjectPaperRecommendation(paper.id);
      await loadLinkedDocs(project.id);
    } catch (e: any) {
      setDocsError(e.message || "Failed to remove paper.");
    } finally {
      setDocActionBusy(false);
    }
  }

  function cancelFlow() {
    setFlowStep("list");
    setPendingDoc(null);
    setRoleChangeTarget(null);
  }

  const roleChooserTitle =
    roleChangeTarget?.title || pendingDoc?.name || "Document";

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

      <div className="flex items-center gap-2.5 bg-surface-1 border border-border-subtle rounded-lg px-3 py-2">
        <GoogleDriveIcon className="w-4 h-4 flex-shrink-0" />
        <p className="flex-1 min-w-0 text-xs text-text-secondary">
          Status:{" "}
          <span className={driveConnected ? "text-green-500" : "text-text-tertiary"}>
            {driveConnected ? "connected" : "not connected"}
          </span>
        </p>
        <button
          onClick={handleConnectDrive}
          disabled={connectingDrive}
          className="flex-shrink-0 px-2.5 py-1 bg-surface-2 hover:bg-surface-0 border border-border-subtle rounded-md text-[11px] text-text-secondary disabled:opacity-50 transition-colors"
        >
          {connectingDrive ? "Connecting…" : driveConnected ? "Reconnect" : "Connect"}
        </button>
      </div>

      <div>
        <label className="text-xs text-text-tertiary block mb-1.5">Active project</label>
        <select
          value={selectedProjectId}
          onChange={(e) => handleProjectChange(e.target.value)}
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
          Linked Google Docs
        </label>

        {docsError && flowStep === "list" && (
          <p className="text-xs text-error mb-2 bg-error-50 border border-error/30 rounded-lg px-3 py-2">
            {docsError}
          </p>
        )}

        {flowStep === "picker" ? (
          <GoogleDocPicker
            docs={pickerDocs}
            selectedDocId=""
            loading={loadingDocs}
            error={docsError}
            onSelect={handlePickerSelect}
            onRefresh={loadGoogleDocs}
            onClose={cancelFlow}
          />
        ) : flowStep === "choose-role" ? (
          <DocRoleChooser
            docTitle={roleChooserTitle}
            showBothOption={showBothOption}
            onConfirm={applyDocRole}
            onCancel={cancelFlow}
            busy={docActionBusy}
          />
        ) : (
          <div className="space-y-2">
            {linkedDocs.length === 0 ? (
              <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">No documents linked</p>
                <p className="text-[11px] text-text-tertiary mb-3">
                  Link context docs for AI and export docs for highlights.
                </p>
              </div>
            ) : (
              linkedDocs.map((doc) => (
                <LinkedProjectDocCard
                  key={doc.id}
                  doc={doc}
                  showBothOption={linkedDocs.length === 1 || doc.role === "both"}
                  onRoleChange={(role) => updateDocRole(doc, role)}
                  onRemove={() => handleRemoveDoc(doc)}
                  onSync={() => handleSyncDoc(doc)}
                  busy={docActionBusy}
                />
              ))
            )}
            <button
              type="button"
              onClick={openPicker}
              disabled={!selectedProjectId || docActionBusy || loadingDocs}
              className={`w-full py-2 text-xs ${BTN_SECONDARY}`}
            >
              {loadingDocs ? "Loading..." : "+ Add document"}
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary block mb-1.5">
          Relevant papers{savedPapers.length > 0 ? ` (${savedPapers.length})` : ""}
        </label>

        <div className="space-y-2">
          {savedPapers.length === 0 ? (
            <div className="bg-surface-1 border border-border-subtle rounded-lg p-3 text-center">
              <p className="text-xs text-text-secondary mb-1">No papers saved yet</p>
              <p className="text-[11px] text-text-tertiary">
                Use the brain icon in chat on a paper page to discover and add papers.
              </p>
            </div>
          ) : (
            savedPapers.map((paper) => (
              <LinkedProjectPaperCard
                key={paper.id}
                paper={paper}
                onRemove={() => handleRemovePaper(paper)}
                busy={docActionBusy}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
