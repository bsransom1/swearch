import { ExternalLink, Trash2 } from "lucide-react";
import type { PaperRecommendation } from "@swearch/shared";

interface Props {
  paper: PaperRecommendation;
  onRemove: () => void;
  busy?: boolean;
}

const actionBtn =
  "inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export default function LinkedProjectPaperCard({ paper, onRemove, busy }: Props) {
  const url = paper.recommended_url ?? "#";

  return (
    <div className="relative bg-surface-1 border border-border-subtle rounded-lg px-3 py-2.5 pr-8">
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="absolute top-2 right-2 rounded-md p-1 text-error hover:bg-error-50 transition-colors disabled:opacity-50"
        title="Remove from project"
        aria-label="Remove from project"
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>

      <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug pr-1">
        {paper.recommended_title}
      </p>

      {(paper.recommended_authors?.length || paper.recommended_year) && (
        <p className="mt-1 text-[11px] text-text-tertiary">
          {paper.recommended_authors?.slice(0, 2).join(", ")}
          {(paper.recommended_authors?.length ?? 0) > 2 ? " et al." : ""}
          {paper.recommended_year ? ` · ${paper.recommended_year}` : ""}
        </p>
      )}

      {paper.relevance_reason && (
        <p className="mt-1.5 text-[11px] text-text-secondary line-clamp-1 italic">
          {paper.relevance_reason}
        </p>
      )}

      <div className="mt-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={actionBtn}
        >
          <ExternalLink size={12} strokeWidth={2} />
          Open
        </a>
      </div>
    </div>
  );
}
