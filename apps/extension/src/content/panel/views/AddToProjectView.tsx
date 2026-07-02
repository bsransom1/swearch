import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileOutput } from "lucide-react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import NoActiveProjectView from "./NoActiveProjectView";
import { bridge, type HighlightAnalysis, type ActiveProject, projectContextParams } from "../lib/bridge";
import {
  BTN_PRIMARY,
  CARD,
  ERROR_TEXT,
  INPUT_FIELD,
  QUOTE_BLOCK,
  TRUNCATION_BANNER,
} from "../../../lib/theme";

interface ActionPayload {
  selectionText: string;
  paperTitle: string;
  paperUrl: string;
  paperDoi: string | null;
  truncated?: boolean;
}

interface Props {
  payload: ActionPayload;
  project: ActiveProject | null;
  onProjectSet: (project: ActiveProject) => void;
  onSaved: () => void;
}

export default function AddToProjectView({
  payload,
  project,
  onProjectSet,
  onSaved,
}: Props) {
  const [analysis, setAnalysis] = useState<HighlightAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<"loading" | "done" | "error">("loading");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  async function runAnalysis(proj: ActiveProject) {
    setAnalysisStatus("loading");
    setAnalysisError(null);
    try {
      const cached = await bridge.checkCached({
        paperUrl: payload.paperUrl,
        selectionText: payload.selectionText,
      });

      const result =
        cached ??
        (await bridge.analyze({
          highlightText: payload.selectionText,
          paperTitle: payload.paperTitle,
          paperUrl: payload.paperUrl,
          ...projectContextParams(proj),
        }));

      setAnalysis(result);
      setAnalysisStatus("done");
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
      setAnalysisStatus("error");
    }
  }

  useEffect(() => {
    if (project) runAnalysis(project);
  }, [project]);

  if (!project) {
    return (
      <NoActiveProjectView
        onProjectSet={async () => {
          const updated = await bridge.getActiveProject();
          if (updated) {
            onProjectSet(updated);
            runAnalysis(updated);
          }
        }}
      />
    );
  }

  if (analysisStatus === "loading") {
    return <LoadingView label="Preparing analysis…" />;
  }

  if (analysisStatus === "error") {
    return (
      <ErrorView
        message={analysisError!}
        onRetry={() => runAnalysis(project)}
      />
    );
  }

  async function handleSave() {
    if (!analysis || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await bridge.saveHighlight({
        selectedText: payload.selectionText,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        paperDoi: payload.paperDoi,
        analysis,
        userNote: note.trim() || undefined,
      });
      setTimeout(onSaved, 800);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="p-3 space-y-3">
      {payload.truncated && (
        <p className={TRUNCATION_BANNER}>
          Selection was long — saving based on the first ~6000 characters.
        </p>
      )}

      <div className={`${CARD} space-y-2`}>
        <p className="text-sm font-medium text-text-primary line-clamp-2">{payload.paperTitle || "Unknown paper"}</p>
        <p className={`${QUOTE_BLOCK} line-clamp-3`}>
          &ldquo;{payload.selectionText.slice(0, 200)}
          {payload.selectionText.length > 200 ? "…" : ""}&rdquo;
        </p>
      </div>

      <div>
        <label className="block text-xs text-text-tertiary mb-1.5">
          Add a note (optional)
        </label>
        <textarea
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why is this relevant? What are you thinking?"
          rows={3}
          className={`w-full resize-none ${INPUT_FIELD}`}
        />
      </div>

      {saveError && (
        <p className={ERROR_TEXT}>
          <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>{saveError}</span>
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={`w-full ${BTN_PRIMARY}`}
      >
        <FileOutput size={14} strokeWidth={2} />
        {saving ? "Saving…" : `Add to ${project.name}`}
      </button>
    </div>
  );
}
