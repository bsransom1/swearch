import type { GoogleDocSummary } from "../../lib/google-docs";
import { formatRelativeDate } from "@swearch/shared/utils/date";
import GoogleDocIcon from "./GoogleDocIcon";

interface Props {
  doc: GoogleDocSummary;
  onChange: () => void;
}

export default function LinkedDocCard({ doc, onChange }: Props) {
  const openUrl =
    doc.webViewLink || `https://docs.google.com/document/d/${doc.id}/edit`;

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-lg p-3">
      <div className="flex items-start gap-2.5">
        <GoogleDocIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">
            {doc.name}
          </p>
          <p className="text-[11px] text-text-tertiary mt-1">
            Modified {formatRelativeDate(doc.modifiedTime)}
          </p>
          <p className="text-[11px] text-green-400/90 mt-1">Linked to this project</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={onChange}
          className="flex-1 py-1.5 bg-surface-2 hover:bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-secondary transition-colors"
        >
          Change
        </button>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-1.5 text-center bg-surface-2 hover:bg-surface-0 border border-border-subtle rounded-lg text-xs text-text-secondary transition-colors"
        >
          Open ↗
        </a>
      </div>
    </div>
  );
}
