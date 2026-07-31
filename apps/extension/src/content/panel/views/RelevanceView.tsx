import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import NoActiveProjectView from "./NoActiveProjectView";
import ActionResultFooter from "../components/ActionResultFooter";
import MarkdownContent from "../../../components/MarkdownContent";
import { bridge, type HighlightAnalysis, type ActiveProject, projectContextParams } from "../lib/bridge";
import { SectionBlock } from "../../../lib/section-ui";
import { TRUNCATION_BANNER } from "../../../lib/theme";

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

function saveParams(payload: ActionPayload, analysis: HighlightAnalysis) {
  return {
    selectedText: payload.selectionText,
    paperTitle: payload.paperTitle,
    paperUrl: payload.paperUrl,
    paperDoi: payload.paperDoi,
    analysis,
  };
}

export default function RelevanceView({ payload, project, onProjectSet }: Props) {
  const [analysis, setAnalysis] = useState<HighlightAnalysis | null>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [added, setAdded] = useState(false);
  const [exported, setExported] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function runAnalysis(proj: ActiveProject) {
    setStatus("loading");
    setError(null);
    try {
      const result = await bridge.analyze({
        highlightText: payload.selectionText,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        ...projectContextParams(proj),
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

  async function handleAddToProject() {
    if (!analysis || adding || exporting) return;
    setAdding(true);
    setAddError(null);
    try {
      await bridge.saveHighlight(saveParams(payload, analysis));
      setAdded(true);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setAdding(false);
    }
  }

  async function handleExport() {
    if (!analysis || adding || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      await bridge.exportHighlightToDoc(saveParams(payload, analysis));
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
          Selection was long — analysis based on the first ~6000 characters.
        </p>
      )}

      <SectionBlock sectionKey="relevance" labelOverride={`Relevance to ${project.name}`}>
        <MarkdownContent content={relevanceText} variant="panel" />
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
            <SectionBlock sectionKey="summary">
              <MarkdownContent content={analysis.summary} variant="panel" />
            </SectionBlock>
          )}
          {analysis.findings && (
            <SectionBlock sectionKey="findings">
              <MarkdownContent content={analysis.findings} variant="panel" />
            </SectionBlock>
          )}
        </div>
      )}

      <ActionResultFooter
        project={project}
        copyText={copyText}
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
