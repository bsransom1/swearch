import { useEffect, useState } from "react";
import LoadingView from "./LoadingView";
import ErrorView from "./ErrorView";
import NoClaimsFoundFallback from "./NoClaimsFoundFallback";
import ActionResultFooter from "../components/ActionResultFooter";
import CopyButton from "../components/CopyButton";
import { bridge, type ActiveProject, projectContextParams } from "../lib/bridge";
import type { ActionPayload } from "../lib/action-bus";
import {
  CARD,
  SECTION_CONTENT,
  TRUNCATION_BANNER,
} from "../../../lib/theme";

interface Props {
  payload: ActionPayload;
  project: ActiveProject | null;
  onSwitchAction: (action: "summarize" | "ask" | "relevance") => void;
}

function claimsAnalysis(claims: string[]) {
  return {
    summary: "",
    methodology: null,
    findings: claims.map((c, i) => `${i + 1}. ${c}`).join("\n"),
    limitations: null,
    relevance: null,
    sample_size: null,
    tags: [] as string[],
  };
}

export default function ExtractClaimsView({ payload, project, onSwitchAction }: Props) {
  const [claims, setClaims] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [added, setAdded] = useState(false);
  const [exported, setExported] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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

  const saveParams = {
    selectedText: payload.selectionText,
    paperTitle: payload.paperTitle,
    paperUrl: payload.paperUrl,
    paperDoi: payload.paperDoi,
    analysis: claimsAnalysis(claims),
  };

  async function handleAddToProject() {
    if (!project || adding || exporting || claims.length === 0) return;
    setAdding(true);
    setAddError(null);
    try {
      await bridge.saveHighlight(saveParams);
      setAdded(true);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setAdding(false);
    }
  }

  async function handleExport() {
    if (!project || adding || exporting || claims.length === 0) return;
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

      <ActionResultFooter
        project={project}
        copyText={allClaimsText}
        copyLabel="Copy all"
        onAddToProject={handleAddToProject}
        onExport={handleExport}
        adding={adding}
        exporting={exporting}
        added={added}
        exported={exported}
        addError={addError}
        exportError={exportError}
        addLabel="Add all to project"
      />
    </div>
  );
}
