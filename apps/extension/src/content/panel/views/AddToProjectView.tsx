import { useEffect, useRef, useState } from "react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import NoActiveProjectView from "./NoActiveProjectView";
import ActionResultFooter from "../components/ActionResultFooter";
import { bridge, type HighlightAnalysis, type ActiveProject, projectContextParams } from "../lib/bridge";
import {
  CARD,
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
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [added, setAdded] = useState(false);
  const [exported, setExported] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
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

  const saveParams = {
    selectedText: payload.selectionText,
    paperTitle: payload.paperTitle,
    paperUrl: payload.paperUrl,
    paperDoi: payload.paperDoi,
    analysis: analysis!,
    userNote: note.trim() || undefined,
  };

  async function handleAddToProject() {
    if (!analysis || adding || exporting) return;
    setAdding(true);
    setAddError(null);
    try {
      await bridge.saveHighlight(saveParams);
      setAdded(true);
      setTimeout(onSaved, 800);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Save failed");
      setAdding(false);
    }
  }

  async function handleExport() {
    if (!analysis || adding || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await bridge.exportHighlightToDoc(saveParams);
      setExported(true);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
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

      <ActionResultFooter
        project={project}
        onAddToProject={handleAddToProject}
        onExport={handleExport}
        adding={adding}
        exporting={exporting}
        added={added}
        exported={exported}
        addError={addError}
        exportError={exportError}
      />
    </div>
  );
}
