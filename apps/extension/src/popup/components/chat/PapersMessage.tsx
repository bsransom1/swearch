import { ExternalLink } from "lucide-react";
import type { DiscoveredPaper } from "@swearch/shared/types/discovered-paper";
import { BTN_PRIMARY, BTN_SECONDARY, SPINNER } from "../../../lib/theme";

interface Props {
  content: string;
  papers: DiscoveredPaper[];
  isLoading?: boolean;
  activeProjectId: string | null;
  addedOpenalexIds: Set<string>;
  onAddPaper: (paper: DiscoveredPaper) => Promise<void>;
  onAddAll: (papers: DiscoveredPaper[]) => Promise<void>;
  addBusy?: boolean;
}

export default function PapersMessage({
  content,
  papers,
  isLoading,
  activeProjectId,
  addedOpenalexIds,
  onAddPaper,
  onAddAll,
  addBusy,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <div className={SPINNER} />
        {content}
      </div>
    );
  }

  const unadded = papers.filter((p) => !addedOpenalexIds.has(p.openalexId));

  if (papers.length === 0) {
    return content ? (
      <p className="text-sm text-text-secondary leading-relaxed">{content}</p>
    ) : null;
  }

  return (
    <div className="space-y-2">
      {papers.map((paper) => {
        const added = addedOpenalexIds.has(paper.openalexId);
        return (
          <div
            key={paper.openalexId}
            className="rounded-lg border border-border-subtle bg-surface-1 p-3 shadow-tier-2"
          >
            <h4 className="text-sm font-medium leading-snug text-text-primary line-clamp-2">
              {paper.title}
            </h4>
            <p className="mt-1 text-[11px] text-text-tertiary">
              {paper.authors.slice(0, 2).join(", ")}
              {paper.authors.length > 2 ? " et al." : ""}
              {paper.year ? ` · ${paper.year}` : ""}
              {paper.citationCount != null && paper.citationCount > 0
                ? ` · ${paper.citationCount} citations`
                : ""}
            </p>
            {paper.relevanceReason && (
              <p className="mt-2 text-[11px] italic leading-snug text-text-secondary">
                {paper.relevanceReason}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View paper"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-text-tertiary hover:text-accent hover:bg-surface-2 transition-colors"
              >
                <ExternalLink size={14} strokeWidth={2} />
              </a>
              {activeProjectId && (
                <button
                  type="button"
                  disabled={added || addBusy}
                  onClick={() => onAddPaper(paper)}
                  className={`px-2 py-0.5 rounded text-[11px] ${BTN_SECONDARY}`}
                >
                  {added ? "Added" : "Add to project"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {!activeProjectId && (
        <p className="text-[11px] text-text-tertiary pt-1">
          Set an active project in Settings to save papers.
        </p>
      )}

      {activeProjectId && unadded.length > 1 && (
        <button
          type="button"
          disabled={addBusy}
          onClick={() => onAddAll(unadded)}
          className={`w-full ${BTN_PRIMARY}`}
        >
          {addBusy ? "Adding…" : `Add all to project (${unadded.length})`}
        </button>
      )}
    </div>
  );
}
