import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileOutput } from "lucide-react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import NoClaimsFoundFallback from "./NoClaimsFoundFallback";
import CopyButton from "../components/CopyButton";
import { bridge, type ActiveProject, projectContextParams } from "../lib/bridge";
import type { ActionPayload } from "../lib/action-bus";
import {
  BTN_PRIMARY,
  CARD,
  ERROR_TEXT,
  SECTION_CONTENT,
  TIER_3_SUCCESS,
  TRUNCATION_BANNER,
} from "../../../lib/theme";

interface Props {
  payload: ActionPayload;
  project: ActiveProject | null;
  onSwitchAction: (action: "summarize" | "ask" | "relevance") => void;
}

export default function ExtractClaimsView({ payload, project, onSwitchAction }: Props) {
  const [claims, setClaims] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function runExtract() {
    setStatus("loading");
    setError(null);
    try {
      const result = await bridge.extractClaims({
        highlightText: payload.selectionText,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        ...projectContextParams(project),
      });
      setClaims(result.claims ?? []);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
      setStatus("error");
    }
  }

  useEffect(() => {
    runExtract();
  }, []);

  async function handleSaveAll() {
    if (!project || saving || claims.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const fakeAnalysis = {
        summary: "",
        methodology: null,
        findings: claims.map((c, i) => `${i + 1}. ${c}`).join("\n"),
        limitations: null,
        relevance: null,
        sample_size: null,
        tags: [] as string[],
      };
      await bridge.saveHighlight({
        selectedText: payload.selectionText,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        paperDoi: payload.paperDoi,
        analysis: fakeAnalysis,
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <LoadingView label="Extracting key claims…" />;
  if (status === "error") return <ErrorView message={error!} onRetry={runExtract} />;
  if (claims.length === 0) {
    return <NoClaimsFoundFallback payload={payload} onSwitchAction={onSwitchAction} />;
  }

  const allClaimsText = claims.map((c, i) => `${i + 1}. ${c}`).join("\n");

  return (
    <div className="p-3 space-y-3">
      {payload.truncated && (
        <p className={TRUNCATION_BANNER}>
          Selection was long — claims based on the first ~6000 characters.
        </p>
      )}

      <ol className="space-y-2">
        {claims.map((claim, i) => (
          <li key={i} className={`flex items-start gap-2 ${CARD}`}>
            <span className="text-xs text-text-tertiary font-mono flex-shrink-0 mt-0.5 w-4">
              {i + 1}.
            </span>
            <p className={`flex-1 ${SECTION_CONTENT}`}>{claim}</p>
            <CopyButton text={claim} label="Copy" className="flex-shrink-0" />
          </li>
        ))}
      </ol>

      {saveError && (
        <p className={ERROR_TEXT}>
          <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>{saveError}</span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle">
        <CopyButton text={allClaimsText} label="Copy all" />
        {project &&
          (saved ? (
            <span className={`flex-1 inline-flex items-center justify-center gap-2 text-xs text-success ${TIER_3_SUCCESS}`}>
              <CheckCircle2 size={14} strokeWidth={2} />
              Added to project
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className={`flex-1 ${BTN_PRIMARY}`}
            >
              <FileOutput size={14} strokeWidth={2} />
              {saving ? "Saving…" : "Add all to project"}
            </button>
          ))}
      </div>
    </div>
  );
}
