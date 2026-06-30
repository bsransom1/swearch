import { useEffect, useState, type MouseEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileOutput,
  FileText,
  Trash2,
} from "lucide-react";
import { SectionBlock, type AnalysisSectionKey } from "../lib/section-ui";
import {
  BTN_DESTRUCTIVE,
  BTN_PRIMARY,
  BTN_SECONDARY,
  ERROR_TEXT,
  QUOTE_BLOCK,
  SUCCESS_TEXT,
  TAG_PILL,
  TIER_2,
} from "../lib/theme";

export interface HighlightCardProps {
  id: string;
  highlightText: string;
  paperTitle: string;
  paperUrl: string;
  tags: string[];
  summary?: string;
  relevance?: string;
  methodology?: string;
  findings?: string;
  limitations?: string;
  sampleSize?: string;
  timestamp: string;
  isExported?: boolean;
  linkedDocId?: string;
  expandable?: boolean;
  onExport?: (id: string) => Promise<void>;
  onCopy?: (text: string) => void;
  onDelete?: (id: string) => Promise<void>;
  compact?: boolean;
}

const EXCERPT_LENGTH = 60;
const MAX_VISIBLE_TAGS = 3;

const SECTION_KEY_BY_LABEL: Record<string, AnalysisSectionKey> = {
  Summary: "summary",
  Relevance: "relevance",
  "Key finding": "findings",
  Methodology: "methodology",
  "Sample size": "sample_size",
  Limitations: "limitations",
};

function stopPropagation(e: MouseEvent) {
  e.stopPropagation();
}

export default function HighlightCard({
  id,
  highlightText,
  paperTitle,
  paperUrl,
  tags,
  summary,
  relevance,
  methodology,
  findings,
  limitations,
  sampleSize,
  timestamp,
  isExported = false,
  linkedDocId,
  expandable = true,
  onExport,
  onCopy,
  onDelete,
  compact = false,
}: HighlightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(isExported);
  const [showAllTags, setShowAllTags] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setExported(isExported);
  }, [isExported]);

  const excerpt =
    highlightText.length > EXCERPT_LENGTH
      ? `${highlightText.slice(0, EXCERPT_LENGTH).trim()}…`
      : highlightText;

  const visibleTags = showAllTags ? tags : tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = tags.length - MAX_VISIBLE_TAGS;
  const canExpand = expandable && !compact;
  const showExport = !!linkedDocId && !!onExport;

  async function handleCopy(e: MouseEvent) {
    stopPropagation(e);
    if (onCopy) {
      await onCopy(highlightText);
    } else {
      await navigator.clipboard.writeText(highlightText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleViewPaper(e: MouseEvent) {
    stopPropagation(e);
    if (paperUrl) {
      window.open(paperUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleExport(e: MouseEvent) {
    stopPropagation(e);
    if (!onExport || exported || exporting) return;

    setExportError(null);
    setDeleteConfirm(false);
    setExporting(true);
    try {
      await onExport(id);
      setExported(true);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  function handleCancelDelete(e: MouseEvent) {
    stopPropagation(e);
    setDeleteConfirm(false);
    setDeleteError(null);
  }

  async function handleDelete(e: MouseEvent) {
    stopPropagation(e);
    if (!onDelete || deleting) return;

    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setDeleteError(null);
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  function toggleExpanded() {
    if (canExpand) {
      setExpanded((v) => !v);
      setDeleteConfirm(false);
      setDeleteError(null);
    }
  }

  function renderTags() {
    if (tags.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-1">
        {visibleTags.map((tag) => (
          <span key={tag} className={TAG_PILL}>
            {tag}
          </span>
        ))}
        {!showAllTags && hiddenTagCount > 0 && (
          <button
            type="button"
            onClick={(e) => {
              stopPropagation(e);
              setShowAllTags(true);
            }}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            +{hiddenTagCount} more
          </button>
        )}
      </div>
    );
  }

  function renderActions() {
    if (deleteConfirm) {
      return (
        <div className="flex items-center gap-2 pt-2" onClick={stopPropagation}>
          <span className="text-xs text-text-tertiary mr-1">Delete this highlight?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={`${BTN_DESTRUCTIVE} px-2 py-1 text-xs disabled:opacity-60`}
          >
            {deleting ? "Deleting…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={handleCancelDelete}
            disabled={deleting}
            className={`${BTN_SECONDARY} px-2 py-1 text-xs disabled:opacity-60`}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2 pt-2" onClick={stopPropagation}>
        <button
          type="button"
          onClick={handleCopy}
          className={`${BTN_SECONDARY} px-2 py-1 text-xs`}
        >
          {copied ? (
            <>
              <CheckCircle2 size={14} strokeWidth={2} className="text-success" />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} strokeWidth={2} />
              Copy
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleViewPaper}
          disabled={!paperUrl}
          className={`${BTN_SECONDARY} px-2 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <ExternalLink size={14} strokeWidth={2} />
          {compact ? "View" : "View Paper"}
        </button>
        {showExport && (
          <button
            type="button"
            onClick={handleExport}
            disabled={exported || exporting}
            className={`${BTN_PRIMARY} px-2 py-1 text-xs disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {exporting ? (
              "Exporting…"
            ) : exported ? (
              <>
                <CheckCircle2 size={14} strokeWidth={2} />
                Exported
              </>
            ) : (
              <>
                <FileOutput size={14} strokeWidth={2} />
                Export
              </>
            )}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className={`${BTN_DESTRUCTIVE} px-2 py-1 text-xs ml-auto`}
          >
            <Trash2 size={14} strokeWidth={2} />
            Delete
          </button>
        )}
      </div>
    );
  }

  function renderExpandedSection(label: string, content: string | undefined) {
    if (!content?.trim()) return null;
    const sectionKey = SECTION_KEY_BY_LABEL[label];
    if (!sectionKey) return null;
    return <SectionBlock sectionKey={sectionKey}>{content}</SectionBlock>;
  }

  return (
    <article
      role="article"
      onClick={toggleExpanded}
      className={`${TIER_2} transition-colors ${
        canExpand ? "cursor-pointer hover:border-border-default" : ""
      } ${expanded ? "bg-surface-2" : ""}`}
    >
      <div className="flex items-start gap-2">
        <FileText size={16} strokeWidth={2} className="text-text-secondary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {expanded && paperUrl ? (
            <a
              href={paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopPropagation}
              className="text-sm font-medium text-text-primary hover:text-accent transition-colors line-clamp-2"
            >
              {paperTitle}
            </a>
          ) : (
            <p className="text-sm font-medium text-text-primary line-clamp-2">{paperTitle}</p>
          )}

          {expanded && paperUrl && (
            <a
              href={paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopPropagation}
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline mt-1 truncate max-w-full"
            >
              <ExternalLink size={14} strokeWidth={2} className="flex-shrink-0" />
              {paperUrl}
            </a>
          )}

          {!expanded && (
            <p className="text-xs text-text-secondary italic mt-1.5 line-clamp-2">
              &ldquo;{excerpt}&rdquo;
            </p>
          )}

          {expanded && (
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Highlight</p>
                <p className={QUOTE_BLOCK}>&ldquo;{highlightText}&rdquo;</p>
              </div>
              {renderExpandedSection("Summary", summary)}
              {renderExpandedSection("Relevance", relevance)}
              {renderExpandedSection("Key finding", findings)}
              {renderExpandedSection("Methodology", methodology)}
              {renderExpandedSection("Sample size", sampleSize)}
              {renderExpandedSection("Limitations", limitations)}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
            {renderTags()}
            {exported && (
              <span className={SUCCESS_TEXT}>
                <CheckCircle2 size={14} strokeWidth={2} />
                Exported
              </span>
            )}
            {(tags.length > 0 || timestamp) && (
              <span className="text-text-tertiary text-xs" aria-hidden>
                •
              </span>
            )}
            <span className="text-xs text-text-tertiary">{timestamp}</span>
          </div>

          {exportError && (
            <p className={`${ERROR_TEXT} mt-1.5`} onClick={stopPropagation}>
              <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
              {exportError}
            </p>
          )}

          {deleteError && (
            <p className={`${ERROR_TEXT} mt-1.5`} onClick={stopPropagation}>
              <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
              {deleteError}
            </p>
          )}

          {renderActions()}
        </div>
      </div>
    </article>
  );
}
