import type { GoogleDocSummary } from "../../lib/google-docs";
import { formatRelativeDate } from "@swearch/shared/utils/date";
import GoogleDocIcon from "./GoogleDocIcon";

interface Props {
  doc: GoogleDocSummary;
  selected: boolean;
  onSelect: () => void;
}

export default function GoogleDocPickerRow({ doc, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
        selected
          ? "bg-accent-muted/40 border border-accent/60"
          : "hover:bg-surface-2 border border-transparent"
      }`}
    >
      <GoogleDocIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-primary line-clamp-2 leading-snug">
          {doc.name}
        </p>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          Modified {formatRelativeDate(doc.modifiedTime)}
        </p>
      </div>
      {selected && (
        <span className="text-accent text-xs flex-shrink-0 mt-0.5" aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}
