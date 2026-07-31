import { useState } from "react";
import { CheckCircle2, Copy, Trash2 } from "lucide-react";
import type {
  ProjectHighlightInsight,
  HighlightDisplayType,
} from "@swearch/shared/types/highlight-analysis";
import {
  inferHighlightType,
  HIGHLIGHT_DISPLAY_BADGE_CLASS,
} from "@swearch/shared/types/highlight-analysis";
import MarkdownContent from "../../../components/MarkdownContent";
import { copyTextToClipboard } from "../../../lib/clipboard";
import { formatRelativeTime } from "../../../lib/utils";

export type { HighlightDisplayType } from "@swearch/shared/types/highlight-analysis";
export { inferHighlightType };

interface Props {
  id: string;
  highlightText: string;
  type: HighlightDisplayType;
  insight?: ProjectHighlightInsight | null;
  createdAt: string | null;
  onRemove: (id: string) => void;
  busy?: boolean;
}

export default function ProjectHighlightCard({
  id,
  highlightText,
  type,
  insight,
  createdAt,
  onRemove,
  busy,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isRelevance = insight?.kind === "relevance";

  async function handleCopy() {
    const ok = await copyTextToClipboard(highlightText);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg shadow-tier-2 p-3 hover:bg-surface-2 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${HIGHLIGHT_DISPLAY_BADGE_CLASS[type]}`}
        >
          {type}
        </span>
        <button
          type="button"
          onClick={() => onRemove(id)}
          disabled={busy}
          className="rounded-md p-1 text-error hover:bg-error-50 transition-colors disabled:opacity-50"
          aria-label="Remove highlight"
        >
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>

      <p className="mt-2 text-sm italic leading-relaxed text-text-primary line-clamp-4">
        &ldquo;{highlightText}&rdquo;
      </p>

      {insight && (
        <div
          className={`mt-2 rounded-lg border px-3 py-2 shadow-tier-2 ${
            isRelevance
              ? "border-accent-200 bg-accent-50"
              : "border-border-subtle bg-surface-2"
          }`}
        >
          <p
            className={`text-[10px] font-medium uppercase tracking-wide mb-1 ${
              isRelevance ? "text-accent" : "text-text-tertiary"
            }`}
          >
            {insight.label}
          </p>
          <MarkdownContent
            content={insight.text}
            variant={isRelevance ? "insight-accent" : "insight-neutral"}
          />
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-0 border border-border-subtle transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle2 size={12} strokeWidth={2} className="text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} strokeWidth={2} />
              Copy
            </>
          )}
        </button>
        {createdAt && (
          <span className="ml-auto text-[10px] text-text-tertiary">
            {formatRelativeTime(createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
