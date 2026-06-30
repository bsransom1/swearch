import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileOutput } from "lucide-react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import NoActiveProjectView from "./NoActiveProjectView";
import CopyButton from "../components/CopyButton";
import { bridge, type HighlightAnalysis, type ActiveProject } from "../lib/bridge";
import { SectionBlock } from "../../../lib/section-ui";
import {
  BTN_PRIMARY,
  ERROR_TEXT,
  TIER_3_SUCCESS,
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
}

export default function RelevanceView({ payload, project, onProjectSet }: Props) {
  const [analysis, setAnalysis] = useState<HighlightAnalysis | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function runAnalysis(proj: ActiveProject) {
    setStatus("loading");
    setError(null);
    try {
      const result = await bridge.analyze({
        highlightText: payload.selectionText,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        projectContext: proj.context ?? "",
        projectName: proj.name,
      });
      setAnalysis(result);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setStatus("error");
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

  if (status === "loading") return <LoadingView label="Checking relevance…" />;
  if (status === "error") return <ErrorView message={error!} onRetry={() => runAnalysis(project)} />;
  if (!analysis) return null;

  const relevanceText = analysis.relevance || "No specific relevance assessment available.";
  const copyText = [
    `Relevance to ${project.name}:`,
    relevanceText,
    "",
    analysis.summary ? `Summary: ${analysis.summary}` : "",
    analysis.findings ? `Key finding: ${analysis.findings}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function handleSave() {
    if (!analysis || !project || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await bridge.saveHighlight({
        selectedText: payload.selectionText,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        paperDoi: payload.paperDoi,
        analysis,
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-3 space-y-3">
      {payload.truncated && (
        <p className={TRUNCATION_BANNER}>
          Selection was long — analysis based on the first ~6000 characters.
        </p>
      )}

      <SectionBlock sectionKey="relevance" labelOverride={`Relevance to ${project.name}`}>
        {relevanceText}
      </SectionBlock>

      <button
        type="button"
        onClick={() => setShowFull((v) => !v)}
        className="w-full flex items-center gap-2 text-left text-xs text-text-tertiary hover:text-text-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 rounded px-1"
      >
        {showFull ? (
          <ChevronUp size={14} strokeWidth={2} className="flex-shrink-0" />
        ) : (
          <ChevronDown size={14} strokeWidth={2} className="flex-shrink-0" />
        )}
        {showFull ? "Hide full analysis" : "Show full analysis"}
      </button>

      {showFull && (
        <div className="space-y-3">
          {analysis.summary && (
            <SectionBlock sectionKey="summary">{analysis.summary}</SectionBlock>
          )}
          {analysis.findings && (
            <SectionBlock sectionKey="findings">{analysis.findings}</SectionBlock>
          )}
        </div>
      )}

      {saveError && (
        <p className={ERROR_TEXT}>
          <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>{saveError}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
        <CopyButton text={copyText} label="Copy" />
        {saved ? (
          <span className={`flex-1 inline-flex items-center justify-center gap-2 text-xs text-success ${TIER_3_SUCCESS}`}>
            <CheckCircle2 size={14} strokeWidth={2} />
            Added to project
          </span>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 ${BTN_PRIMARY}`}
          >
            <FileOutput size={14} strokeWidth={2} />
            {saving ? "Saving…" : "Add to project"}
          </button>
        )}
      </div>
    </div>
  );
}
