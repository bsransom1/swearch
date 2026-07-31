"use client";

import { HIGHLIGHT_DISPLAY_BADGE_CLASS } from "@swearch/shared/types/highlight-analysis";
import type {
  HighlightDisplayType,
  ProjectHighlightInsight,
} from "@swearch/shared/types/highlight-analysis";
import { formatRelativeTime } from "@/lib/utils";

interface Props {
  id: string;
  highlightText: string;
  type: HighlightDisplayType;
  insight: ProjectHighlightInsight | null;
  createdAt: string | null;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function HighlightIndexRow({
  id,
  highlightText,
  type,
  insight,
  createdAt,
  selected,
  onSelect,
}: Props) {
  const previewText = insight?.text ?? null;

  return (
    <button
      type="button"
      data-highlight-id={id}
      onClick={() => onSelect(id)}
      className={`w-full text-left px-3 py-2.5 border-l-2 transition-colors duration-150 ease-out focus:outline-none focus-visible:bg-accent-50/70 ${
        selected
          ? "border-accent bg-accent-50/50"
          : "border-transparent hover:bg-surface-1"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex flex-shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${HIGHLIGHT_DISPLAY_BADGE_CLASS[type]}`}
        >
          {type}
        </span>
        {createdAt && (
          <span className="text-[10px] text-text-tertiary flex-shrink-0 mt-0.5">
            {formatRelativeTime(createdAt)}
          </span>
        )}
      </div>
      <p className="mt-1 text-[12px] italic text-text-primary leading-snug line-clamp-2">
        &ldquo;{highlightText}&rdquo;
      </p>
      {previewText && (
        <p className="mt-1 text-[11px] text-text-secondary leading-snug line-clamp-1">
          {previewText.replace(/\*\*/g, "").replace(/\*/g, "")}
        </p>
      )}
    </button>
  );
}
