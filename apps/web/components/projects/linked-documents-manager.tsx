"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getGoogleAccessToken,
  listGoogleDocs,
  readGoogleDoc,
  type GoogleDocSummary,
} from "@/lib/google-docs";
import {
  fetchProjectGoogleDocs,
  linkProjectGoogleDoc,
  refreshProjectGoogleDocCache,
  removeProjectGoogleDoc,
  triggerDocSummary,
  updateProjectGoogleDocRole,
} from "@/lib/project-google-docs";
import {
  roleBadges,
  type ProjectGoogleDoc,
  type ProjectGoogleDocRole,
} from "@swearch/shared/types/project-google-doc";

interface Props {
  projectId: string;
  initialDocs: ProjectGoogleDoc[];
}

type FlowStep = "list" | "picker" | "choose-role";

export default function LinkedDocumentsManager({ projectId, initialDocs }: Props) {
  const supabase = createClient();
  const [linkedDocs, setLinkedDocs] = useState<ProjectGoogleDoc[]>(initialDocs);
  const [googleDocs, setGoogleDocs] = useState<GoogleDocSummary[]>([]);
  const [flowStep, setFlowStep] = useState<FlowStep>("list");
  const [pendingDoc, setPendingDoc] = useState<GoogleDocSummary | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<ProjectGoogleDoc | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const reload = useCallback(async () => {
    const docs = await fetchProjectGoogleDocs(supabase, projectId);
    setLinkedDocs(docs);
  }, [projectId, supabase]);

  useEffect(() => {
    setLinkedDocs(initialDocs);
  }, [initialDocs]);

  const linkedIds = useMemo(() => new Set(linkedDocs.map((d) => d.google_doc_id)), [linkedDocs]);

  const pickerDocs = useMemo(() => {
    const available = googleDocs.filter((d) => !linkedIds.has(d.id));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return available;
    return available.filter((d) => d.name.toLowerCase().includes(q));
  }, [googleDocs, linkedIds, searchQuery]);

  const showBothOption = roleChangeTarget ? linkedDocs.length === 1 : linkedDocs.length === 0;

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return getGoogleAccessToken(async () => session);
  }

  async function openPicker() {
    setFlowStep("picker");
    setPendingDoc(null);
    setRoleChangeTarget(null);
    setError(null);
    setLoadingDocs(true);
    try {
      const token = await getToken();
      setGoogleDocs(await listGoogleDocs(token));
    } catch (e: any) {
      setError(e.message || "Failed to load Google Docs.");
    } finally {
      setLoadingDocs(false);
    }
  }

  function cancelFlow() {
    setFlowStep("list");
    setPendingDoc(null);
    setRoleChangeTarget(null);
    setSearchQuery("");
  }

  function handlePickerSelect(doc: GoogleDocSummary) {
    setPendingDoc(doc);
    setRoleChangeTarget(null);
    setFlowStep("choose-role");
  }

  async function applyRole(role: ProjectGoogleDocRole) {
    setBusy(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (roleChangeTarget) {
        await updateProjectGoogleDocRole(
          supabase,
          roleChangeTarget.id,
          projectId,
          role
        );
      } else if (pendingDoc) {
        const token = await getToken();
        let cachedText = "";
        try {
          cachedText = await readGoogleDoc(token, pendingDoc.id);
        } catch {
          // cache optional
        }

        const linked = await linkProjectGoogleDoc(supabase, {
          projectId,
          userId: user.id,
          googleDocId: pendingDoc.id,
          title: pendingDoc.name,
          role,
          cachedText,
          sortOrder: linkedDocs.length,
        });
        if (cachedText && linked.id) {
          triggerDocSummary(supabase, linked.id).catch(() => {});
        }
      }

      await reload();
      cancelFlow();
    } catch (e: any) {
      setError(e.message || "Failed to save document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSync(doc: ProjectGoogleDoc) {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      await refreshProjectGoogleDocCache(supabase, doc.id, doc.google_doc_id, () =>
        readGoogleDoc(token, doc.google_doc_id)
      );
      triggerDocSummary(supabase, doc.id).catch(() => {});
      await reload();
    } catch (e: any) {
      setError(e.message || "Failed to sync document.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(doc: ProjectGoogleDoc) {
    if (!window.confirm(`Remove "${doc.title}" from this project?`)) return;
    setBusy(true);
    setError(null);
    try {
      await removeProjectGoogleDoc(supabase, doc.id);
      await reload();
    } catch (e: any) {
      setError(e.message || "Failed to remove document.");
    } finally {
      setBusy(false);
    }
  }

  const roleTitle = roleChangeTarget?.title || pendingDoc?.name || "Document";

  return (
    <section className="mb-8">
      <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
        Linked Google Docs
      </h2>

      {error && flowStep === "list" && (
        <p className="text-xs text-red-400 mb-3 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {flowStep === "picker" ? (
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-text-primary">Choose a document</p>
            <button
              type="button"
              onClick={cancelFlow}
              className="text-xs text-text-tertiary hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents…"
            className="w-full px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg text-sm text-text-primary"
          />
          {loadingDocs ? (
            <p className="text-sm text-text-tertiary py-4 text-center">Loading…</p>
          ) : pickerDocs.length === 0 ? (
            <p className="text-sm text-text-tertiary py-4 text-center">No documents available.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {pickerDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handlePickerSelect(doc)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-2 transition-colors"
                >
                  <p className="text-sm text-text-primary truncate">{doc.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : flowStep === "choose-role" ? (
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
              How should Swearch use this doc?
            </p>
            <p className="text-sm font-medium text-text-primary mt-1">{roleTitle}</p>
          </div>
          <RoleOption
            label="Context"
            description="Swearch reads this for AI answers and highlight analysis."
            onSelect={() => applyRole("context")}
            disabled={busy}
          />
          <RoleOption
            label="Export"
            description="Highlights append here when you export."
            onSelect={() => applyRole("export")}
            disabled={busy}
          />
          {showBothOption && (
            <RoleOption
              label="Both"
              description="Swearch reads this and exports highlights here."
              onSelect={() => applyRole("both")}
              disabled={busy}
            />
          )}
          <button
            type="button"
            onClick={cancelFlow}
            disabled={busy}
            className="w-full py-2 text-sm border border-border-subtle rounded-lg text-text-secondary hover:bg-surface-2"
          >
            Cancel
          </button>
          <p className="text-xs text-text-tertiary text-center">Select a role above to continue.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedDocs.length === 0 ? (
            <div className="bg-surface-1 border border-border-subtle rounded-xl p-5 text-center">
              <p className="text-sm text-text-secondary">No documents linked</p>
              <p className="text-xs text-text-tertiary mt-1">
                Link context docs for AI and export docs for highlights.
              </p>
            </div>
          ) : (
            linkedDocs.map((doc) => {
              const badges = roleBadges(doc.role as ProjectGoogleDocRole);
              const synced = !!(doc.summary?.trim() || doc.cached_text?.trim());
              return (
                <div
                  key={doc.id}
                  className="bg-surface-1 border border-border-subtle rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {badges.map((badge) => (
                          <span
                            key={badge}
                            className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-2 border border-border-subtle text-text-secondary"
                          >
                            {badge}
                          </span>
                        ))}
                        <span className={`text-[10px] ${synced ? "text-green-400" : "text-amber-400"}`}>
                          {doc.summary ? "✓ summary" : synced ? "✓ synced" : "⚠ not synced"}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`https://docs.google.com/document/d/${doc.google_doc_id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex-shrink-0"
                    >
                      Open ↗
                    </a>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRoleChangeTarget(doc);
                        setPendingDoc(null);
                        setFlowStep("choose-role");
                      }}
                      disabled={busy}
                      className="flex-1 py-1.5 text-xs border border-border-subtle rounded-lg text-text-secondary hover:bg-surface-2"
                    >
                      Change role
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSync(doc)}
                      disabled={busy}
                      className="flex-1 py-1.5 text-xs border border-border-subtle rounded-lg text-text-secondary hover:bg-surface-2"
                      title="Re-read document content from Google Docs"
                    >
                      Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(doc)}
                      disabled={busy}
                      className="flex-1 py-1.5 text-xs border border-red-900/50 text-red-400 hover:bg-red-950/30 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
          <button
            type="button"
            onClick={openPicker}
            disabled={busy || loadingDocs}
            className="w-full py-2.5 text-sm border border-border-subtle rounded-xl text-text-primary hover:bg-surface-1 transition-colors"
          >
            {loadingDocs ? "Loading…" : "+ Add document"}
          </button>
        </div>
      )}
    </section>
  );
}

function RoleOption({
  label,
  description,
  onSelect,
  disabled,
}: {
  label: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5 p-3 rounded-lg border border-border-subtle hover:bg-surface-2 cursor-pointer has-[:checked]:border-accent">
      <input
        type="radio"
        name="web-doc-role"
        disabled={disabled}
        onChange={onSelect}
        className="mt-0.5"
      />
      <span>
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="block text-xs text-text-tertiary mt-0.5">{description}</span>
      </span>
    </label>
  );
}
