import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileOutput } from "lucide-react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import CopyButton from "../components/CopyButton";
import { bridge, type HighlightAnalysis, type ActiveProject } from "../lib/bridge";
import { getCachedAnalysis } from "../lib/highlight-cache";
import { getAnalysisSections } from "@swearch/shared/types/highlight-analysis";
import { SectionBlock, sectionKeyFromAnalysisKey } from "../../../lib/section-ui";
import {
  BTN_PRIMARY,
  ERROR_TEXT,
  QUOTE_BLOCK,
  SECTION_LABEL,
  TAG_PILL,
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

export default function SummarizeView({ payload, project }: Props) {
  const [analysis, setAnalysis] = useState<HighlightAnalysis | null>(null);
  const [status, setStatus] = useState<"loading" | "cached" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        projectContext: project?.context ?? "",
        projectName: project?.name ?? "Research Project",
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
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
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
            {content as string}
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

      {saveError && (
        <p className={ERROR_TEXT}>
          <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>{saveError}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
        <CopyButton text={formatAnalysisForCopy(payload, analysis)} label="Copy" />
        {project &&
          (saved ? (
            <span className={`flex-1 inline-flex items-center justify-center gap-2 text-xs text-success ${TIER_3_SUCCESS}`}>
              <CheckCircle2 size={14} strokeWidth={2} />
              Added to {project.name}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAddToProject}
              disabled={saving}
              className={`flex-1 ${BTN_PRIMARY}`}
            >
              <FileOutput size={14} strokeWidth={2} />
              {saving ? "Saving…" : `Add to ${project.name}`}
            </button>
          ))}
      </div>
    </div>
  );
}
