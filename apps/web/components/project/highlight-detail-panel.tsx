"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, FileOutput, Trash2 } from "lucide-react";
import type { HighlightDisplayType } from "@swearch/shared/types/highlight-analysis";
import {
  getAnalysisSections,
  HIGHLIGHT_DISPLAY_BADGE_CLASS,
  parseHighlightAnalysis,
} from "@swearch/shared/types/highlight-analysis";
import MarkdownContent from "@/components/ui/markdown-content";
import { copyTextToClipboard } from "@/lib/clipboard";
import { formatRelativeTime } from "@/lib/utils";
import { BTN_SECONDARY, SPINNER } from "@swearch/shared/theme";

interface Props {
  id: string;
  highlightText: string;
  type: HighlightDisplayType;
  paperTitle: string | null;
  paperUrl: string | null;
  createdAt: string | null;
  exported: boolean;
  analysisFields: {
    ai_summary: string | null;
    ai_findings: string | null;
    ai_methodology: string | null;
    ai_limitations: string | null;
    ai_relevance: string | null;
    ai_sample_size: string | null;
  };
  onClear: () => void;
  onExport?: (id: string) => Promise<void>;
  onRemove: (id: string) => void;
  busy?: boolean;
}

export default function HighlightDetailPanel({
  id,
  highlightText,
  type,
  paperTitle,
  paperUrl,
  createdAt,
  exported,
  analysisFields,
  onClear,
  onExport,
  onRemove,
  busy,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const analysis = parseHighlightAnalysis({
    summary: analysisFields.ai_summary,
    findings: analysisFields.ai_findings,
    methodology: analysisFields.ai_methodology,
    limitations: analysisFields.ai_limitations,
    sample_size: analysisFields.ai_sample_size,
    relevance: analysisFields.ai_relevance,
  });
  const sections = getAnalysisSections(analysis);

  async function handleCopy() {
    const ok = await copyTextToClipboard(highlightText);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleExport() {
    if (!onExport) return;
    setExporting(true);
    try {
      await onExport(id);
    } finally {
      setExporting(false);
    }
  }

  const relevanceSection = sections.find((s) => s.key === "relevance");
  const otherSections = sections.filter((s) => s.key !== "relevance");

  return (
    <div className="p-6 max-w-2xl space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 hover:text-text-primary transition-colors duration-150"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          Overview
        </button>
        {paperTitle && (
          <>
            <span>/</span>
            <span className="text-text-secondary truncate max-w-[200px]">{paperTitle}</span>
          </>
        )}
        <span>/</span>
        <span className="text-text-primary">Highlight</span>
      </div>

      {/* Header: badge + paper source */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${HIGHLIGHT_DISPLAY_BADGE_CLASS[type]}`}
        >
          {type}
        </span>
        {paperTitle && paperUrl && (
          <a
            href={paperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent transition-colors"
          >
            <ExternalLink size={11} strokeWidth={2} />
            <span className="truncate max-w-[240px]">{paperTitle}</span>
          </a>
        )}
      </div>

      {/* Quote */}
      <blockquote className="border-l-2 border-accent pl-4">
        <p className="text-[15px] italic leading-relaxed text-text-primary">
          &ldquo;{highlightText}&rdquo;
        </p>
      </blockquote>

      {/* Relevance callout */}
      {relevanceSection && (
        <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent mb-1.5">
            For your project
          </p>
          <MarkdownContent content={relevanceSection.content as string} variant="insight-accent" />
        </div>
      )}

      {/* Other analysis sections */}
      {otherSections.map((section) => (
        <div key={section.key} className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {section.label}
          </p>
          <MarkdownContent
            content={section.content as string}
            variant="insight-neutral"
          />
        </div>
      ))}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={BTN_SECONDARY + " text-[12px] py-1.5 px-3"}
        >
          {copied ? (
            <>
              <CheckCircle2 size={13} strokeWidth={2} className="text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy size={13} strokeWidth={2} />
              Copy
            </>
          )}
        </button>
        {onExport && (
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting || busy}
            className={BTN_SECONDARY + " text-[12px] py-1.5 px-3 disabled:opacity-50"}
          >
            {exporting ? (
              <span className={SPINNER} />
            ) : (
              <FileOutput size={13} strokeWidth={2} />
            )}
            {exported ? "Re-export" : "Export"}
          </button>
        )}
        <button
          type="button"
          onClick={() => { onRemove(id); onClear(); }}
          disabled={busy}
          className={BTN_SECONDARY + " text-[12px] py-1.5 px-3 text-error hover:bg-error-50 disabled:opacity-50"}
        >
          <Trash2 size={13} strokeWidth={2} />
          Delete
        </button>
        {createdAt && (
          <span className="ml-auto text-[11px] text-text-tertiary">
            {formatRelativeTime(createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
