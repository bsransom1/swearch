import { useEffect, useState } from "react";
import { analyzeHighlight, type HighlightAnalysis } from "../../lib/claude";
import HighlightAnalysisFeedback from "../components/HighlightAnalysisFeedback";
import { buildHighlightExportBlocks } from "@swearch/shared/export/highlight-doc-blocks";
import {
  appendBlocksToGoogleDoc,
  resolveLinkedDocId,
} from "../../lib/google-docs";
import { findRelatedPapers, buildSearchQueryFromAnalysis } from "../../lib/semantic-scholar";
import { storage } from "../../lib/storage";
import { supabase } from "../../lib/supabase";

interface Props {
  onBack: () => void;
}

type Status = "analyzing" | "done" | "error";
type ExportStatus = "idle" | "exporting" | "done" | "error";

export default function HighlightView({ onBack }: Props) {
  const [highlight, setHighlight] = useState<any>(null);
  const [analysis, setAnalysis] = useState<HighlightAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [status, setStatus] = useState<Status>("analyzing");
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedHighlightId, setSavedHighlightId] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const stored = await storage.get([
        "currentProjectId",
        "currentProjectName",
        "currentProjectContext",
        "currentProjectDocId",
      ]);

      const { pendingAction } = await storage.get(["pendingAction"]);

      if (!pendingAction || pendingAction.type !== "summarize") {
        setError("Use right-click → Swearch → Summarize selection on highlighted text.");
        setStatus("error");
        return;
      }

      const payload = pendingAction.payload;
      setHighlight(payload);

      if (!stored.currentProjectId) {
        setError("No active project selected. Set one in Settings.");
        setStatus("error");
        return;
      }

      try {
        const result = await analyzeHighlight({
          highlightText: payload.selectedText,
          paperTitle: payload.paperTitle,
          paperUrl: payload.paperUrl,
          projectContext: stored.currentProjectContext || "",
          projectName: stored.currentProjectName || "Research Project",
        });

        setAnalysis(result);
        setStatus("done");

        // Persist to database and get the saved highlight ID for export tracking
        const id = await saveHighlightToDb(payload, result, stored);
        setSavedHighlightId(id);

        // Fetch related papers asynchronously — don't block UI
        const query = buildSearchQueryFromAnalysis(result, payload.paperTitle);
        findRelatedPapers(query, 3)
          .then(setRecommendations)
          .catch((err) => console.warn("Recommendations failed:", err));

        await storage.remove(["pendingAction"]);
      } catch (e: any) {
        setError(e.message || "Analysis failed");
        setStatus("error");
      }
    }

    run();
  }, []);

  async function saveHighlightToDb(
    hl: any,
    result: HighlightAnalysis,
    stored: any
  ): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Upsert paper record — handles duplicate URLs per project via unique constraint
    const { data: paper, error: paperError } = await supabase
      .from("papers_analyzed")
      .upsert(
        {
          user_id: user.id,
          project_id: stored.currentProjectId,
          paper_title: hl.paperTitle,
          paper_url: hl.paperUrl,
          paper_doi: hl.paperDoi,
          last_highlighted_at: new Date().toISOString(),
        },
        { onConflict: "user_id,paper_url,project_id" }
      )
      .select()
      .single();

    if (paperError || !paper) {
      console.error("Failed to upsert paper:", paperError);
      return null;
    }

    const { data: highlight, error: hlError } = await supabase
      .from("highlights")
      .insert({
        user_id: user.id,
        paper_id: paper.id,
        project_id: stored.currentProjectId,
        highlight_text: hl.selectedText,
        ai_summary: result.summary,
        ai_methodology: result.methodology,
        ai_findings: result.findings,
        ai_limitations: result.limitations,
        ai_relevance: result.relevance,
        ai_sample_size: result.sample_size,
      })
      .select()
      .single();

    if (hlError) {
      console.error("Failed to insert highlight:", hlError);
      return null;
    }

    // Increment paper highlight count via RPC
    await supabase.rpc("increment_highlight_count", { paper_id: paper.id });

    return highlight?.id ?? null;
  }

  async function handleExport() {
    if (!analysis || !highlight) return;

    setExportError(null);
    const docId = await resolveLinkedDocId();
    if (!docId) {
      setExportStatus("error");
      setExportError(
        "No Google Doc linked. Open Settings, connect Google Drive, pick a doc, and save."
      );
      return;
    }

    setExportStatus("exporting");
    try {
      const blocks = buildHighlightExportBlocks({
        paperTitle: highlight.paperTitle,
        paperUrl: highlight.paperUrl,
        highlightText: highlight.selectedText,
        analysis,
        timestamp: new Date().toLocaleString(),
      });

      await appendBlocksToGoogleDoc(docId, blocks);
      setExportStatus("done");

      if (savedHighlightId) {
        await supabase
          .from("highlights")
          .update({
            exported_to_google_doc: true,
            google_doc_exported_at: new Date().toISOString(),
          })
          .eq("id", savedHighlightId);
      }
    } catch (e: any) {
      console.error("Export failed:", e);
      setExportStatus("error");
      setExportError(e.message || "Export failed");
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
        >
          ← Back
        </button>
        <span className="text-xs text-text-tertiary">
          {status === "analyzing" ? "Analyzing..." : status === "done" ? "Done" : "Error"}
        </span>
      </div>

      {/* Highlight preview */}
      {highlight && (
        <div className="bg-surface-1 rounded-lg p-3 border border-border-subtle">
          <p className="text-xs text-text-tertiary mb-1">Highlighted text</p>
          <p className="text-sm text-text-primary line-clamp-3">
            "{highlight.selectedText}"
          </p>
          <p className="text-xs text-text-tertiary mt-1 truncate">
            {highlight.paperTitle || highlight.paperUrl}
          </p>
        </div>
      )}

      {/* Loading */}
      {status === "analyzing" && (
        <div className="flex items-center gap-2 text-sm text-text-secondary py-2">
          <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Analyzing with Claude...
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="bg-red-950 border border-red-900 rounded-lg p-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Analysis results */}
      {status === "done" && analysis && (
        <>
          <HighlightAnalysisFeedback analysis={analysis} />

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exportStatus === "exporting" || exportStatus === "done"}
            className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {exportStatus === "idle" && "Add to Google Doc"}
            {exportStatus === "exporting" && "Exporting..."}
            {exportStatus === "done" && "✓ Added to Doc"}
            {exportStatus === "error" && "Export failed — retry"}
          </button>

          {exportError && (
            <p className="text-xs text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
              {exportError}
            </p>
          )}

          {/* Related papers */}
          {recommendations.length > 0 && (
            <div>
              <p className="text-xs text-text-tertiary mb-2">Related papers</p>
              <div className="flex flex-col gap-1.5">
                {recommendations.map((paper) => (
                  <a
                    key={paper.paperId}
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-surface-1 hover:bg-surface-2 rounded-lg p-2 border border-border-subtle transition-colors"
                  >
                    <p className="text-xs text-text-primary font-medium line-clamp-2">
                      {paper.title}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {paper.authors.slice(0, 2).join(", ")}
                      {paper.year ? ` · ${paper.year}` : ""}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
