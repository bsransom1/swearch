import { ExternalLink } from "lucide-react";
import type { DiscoveredPaper } from "@swearch/shared/types/discovered-paper";
import { BTN_SECONDARY, SPINNER } from "../../../lib/theme";

interface Props {
  content: string;
  papers: DiscoveredPaper[];
  searchQuery?: string;
  total?: number;
  isLoading?: boolean;
  activeProjectId: string | null;
  addedOpenalexIds: Set<string>;
  onAddPaper: (paper: DiscoveredPaper) => Promise<void>;
  addBusy?: boolean;
}

function formatAuthorLine(authors: string[]): string {
  if (authors.length === 0) return "";
  const head = authors.slice(0, 2).join(", ");
  return authors.length > 2 ? `${head} et al.` : head;
}

export default function PapersMessage({
  content,
  papers,
  searchQuery,
  total,
  isLoading,
  activeProjectId,
  addedOpenalexIds,
  onAddPaper,
  addBusy,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <div className={SPINNER} />
        Getting relevant papers…
      </div>
    );
  }

  if (papers.length === 0) {
    return content ? (
      <p className="text-sm text-text-secondary leading-relaxed">{content}</p>
    ) : null;
  }

  const count = total ?? papers.length;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-text-primary">
          {count} related paper{count === 1 ? "" : "s"}
        </p>
        {searchQuery && (
          <p className="mt-0.5 text-[11px] text-text-tertiary" title={searchQuery}>
            Search: {searchQuery}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {papers.map((paper) => {
          const added = addedOpenalexIds.has(paper.openalexId);
          const authorLine = formatAuthorLine(paper.authors);
          const meta = [
            authorLine,
            paper.year ? String(paper.year) : "",
            paper.citationCount != null && paper.citationCount > 0
              ? `${paper.citationCount} citations`
              : "",
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <div
              key={paper.openalexId}
              className="rounded-lg border border-border-subtle bg-surface-1 p-3"
            >
              <h4 className="text-sm font-medium leading-snug text-text-primary">
                {paper.title}
              </h4>
              {meta && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-text-tertiary">
                  {meta}
                </p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
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
      </div>

      {!activeProjectId && (
        <p className="text-[11px] text-text-tertiary">
          Set an active project in Settings to save papers.
        </p>
      )}
    </div>
  );
}
