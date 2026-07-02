import { ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import type { ProjectGoogleDoc, ProjectGoogleDocRole } from "@swearch/shared/types/project-google-doc";
import GoogleDocIcon from "./GoogleDocIcon";

export const DOC_ROLE_OPTIONS: {
  value: ProjectGoogleDocRole;
  label: string;
  description: string;
}[] = [
  {
    value: "context",
    label: "Context",
    description: "Swearch reads this for AI answers and highlight analysis.",
  },
  {
    value: "export",
    label: "Export",
    description: "Highlights append here when you export.",
  },
  {
    value: "both",
    label: "Both",
    description: "Swearch reads this and exports highlights here.",
  },
];

interface Props {
  doc: ProjectGoogleDoc;
  showBothOption?: boolean;
  onRoleChange: (role: ProjectGoogleDocRole) => void;
  onRemove: () => void;
  onSync?: () => Promise<void>;
  busy?: boolean;
}

const actionBtn =
  "inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:pointer-events-none";

export default function LinkedProjectDocCard({
  doc,
  showBothOption = false,
  onRoleChange,
  onRemove,
  onSync,
  busy,
}: Props) {
  const openUrl = `https://docs.google.com/document/d/${doc.google_doc_id}/edit`;
  const synced = !!(doc.summary?.trim() || doc.cached_text?.trim());
  const roleOptions = DOC_ROLE_OPTIONS.filter(
    (option) => option.value !== "both" || showBothOption || doc.role === "both"
  );
  const roleDescription =
    DOC_ROLE_OPTIONS.find((option) => option.value === doc.role)?.description ?? "";

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

      <div className="flex items-start gap-2">
        <GoogleDocIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug pr-1">
            {doc.title}
          </p>

          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <select
              value={doc.role}
              disabled={busy}
              onChange={(e) => onRoleChange(e.target.value as ProjectGoogleDocRole)}
              className="min-w-0 flex-1 max-w-[9.5rem] rounded-md border border-border-subtle bg-surface-0 px-2 py-1 text-[11px] text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
              aria-label="Document role"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionBtn}
              title="Open in Google Docs"
            >
              <ExternalLink size={13} strokeWidth={2} />
              <span>Open</span>
            </a>

            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={busy}
                className={actionBtn}
                title="Re-read document content from Google Docs"
              >
                <RefreshCw size={13} strokeWidth={2} />
                <span>Sync</span>
              </button>
            )}

            <span
              className={`ml-auto text-[10px] ${synced ? "text-green-500" : "text-amber-500"}`}
            >
              {doc.summary ? "✓ summary" : synced ? "✓ synced" : "⚠ not synced"}
            </span>
          </div>

          <p className="mt-1 text-[10px] leading-snug text-text-tertiary">{roleDescription}</p>
        </div>
      </div>
    </div>
  );
}
