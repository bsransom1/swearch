import { useEffect, useState } from "react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import ActionResultFooter from "../components/ActionResultFooter";
import MarkdownContent from "../../../components/MarkdownContent";
import { bridge, type HighlightAnalysis, type ActiveProject, projectContextParams } from "../lib/bridge";
import { getCachedAnalysis } from "../lib/highlight-cache";
import { getAnalysisSections } from "@swearch/shared/types/highlight-analysis";
import { SectionBlock, sectionKeyFromAnalysisKey } from "../../../lib/section-ui";
import {
  QUOTE_BLOCK,
  SECTION_LABEL,
  TAG_PILL,
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
}

function formatAnalysisForCopy(
  payload: ActionPayload,
  analysis: HighlightAnalysis
): string {
  return [
    `"${payload.selectionText}"`,
    "",
    `Summary: ${analysis.summary}`,
    analysis.findings ? `Key finding: ${analysis.findings}` : "",
    analysis.methodology ? `Methodology: ${analysis.methodology}` : "",
    analysis.limitations ? `Limitations: ${analysis.limitations}` : "",
    analysis.relevance ? `Relevance: ${analysis.relevance}` : "",
  ]
    .filter(Boolean)
    .join("\n");
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

export default function SummarizeView({ payload, project }: Props) {
  const [analysis, setAnalysis] = useState<HighlightAnalysis | null>(null);
  const [status, setStatus] = useState<"loading" | "cached" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [added, setAdded] = useState(false);
  const [exported, setExported] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function runAnalysis() {
    setStatus("loading");
    setError(null);

    try {
      const cachedResult = await getCachedAnalysis(
        payload.selectionText,
        payload.paperUrl
      );

      if (cachedResult) {
        setAnalysis(cachedResult);
        setStatus("cached");
        return;
      }

      const result = await bridge.analyze({
        highlightText: payload.selectionText,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        ...projectContextParams(project),
      });

      setAnalysis(result);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setStatus("error");
    }
  }

  useEffect(() => {
    runAnalysis();
  }, []);

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

  if (status === "loading") return <LoadingView label="Analyzing with Claude…" />;
  if (status === "error") return <ErrorView message={error!} onRetry={runAnalysis} />;
  if (!analysis) return null;

  const sections = getAnalysisSections(analysis as any);

  return (
    <div className="p-3 space-y-3">
      {payload.truncated && (
        <p className={TRUNCATION_BANNER}>
          Selection was long — analysis is based on the first ~6000 characters.
        </p>
      )}

      {status === "cached" && (
        <p className="text-xs text-text-tertiary">
          Previously analyzed — showing cached result
        </p>
      )}

      <div>
        <p className={`${SECTION_LABEL} mb-1`}>
          <span>Highlight</span>
        </p>
        <p className={QUOTE_BLOCK}>
          &ldquo;{payload.selectionText.slice(0, 300)}
          {payload.selectionText.length > 300 ? "…" : ""}&rdquo;
        </p>
      </div>

      {sections.map(({ key, label, content }) => {
        const sectionKey = sectionKeyFromAnalysisKey(key);
        if (!sectionKey) return null;
        return (
          <SectionBlock key={key} sectionKey={sectionKey} labelOverride={label}>
            <MarkdownContent content={content as string} variant="panel" />
          </SectionBlock>
        );
      })}

      {analysis.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {analysis.tags.map((tag) => (
            <span key={tag} className={TAG_PILL}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <ActionResultFooter
        project={project}
        copyText={formatAnalysisForCopy(payload, analysis)}
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
