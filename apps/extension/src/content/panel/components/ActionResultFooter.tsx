import { AlertCircle, CheckCircle2, FileOutput, Loader2 } from "lucide-react";
import CopyButton from "./CopyButton";
import type { ActiveProject } from "../lib/bridge";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  ERROR_TEXT,
  TIER_3_SUCCESS,
} from "../../../lib/theme";

interface Props {
  project: ActiveProject | null;
  copyText?: string;
  copyLabel?: string;
  onAddToProject: () => void;
  onExport: () => void;
  adding: boolean;
  exporting: boolean;
  added: boolean;
  exported: boolean;
  addError?: string | null;
  exportError?: string | null;
  addLabel?: string;
}

export default function ActionResultFooter({
  project,
  copyText,
  copyLabel = "Copy",
  onAddToProject,
  onExport,
  adding,
  exporting,
  added,
  exported,
  addError,
  exportError,
  addLabel = "Add to project",
}: Props) {
  if (!project) {
    return (
      <p className={`${ERROR_TEXT} pt-3 mt-3 border-t border-border-subtle`}>
        <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
        <span>Set an active project first</span>
      </p>
    );
  }

  return (
    <div className="pt-3 mt-3 border-t border-border-subtle space-y-2">
      <div className="flex items-center gap-2">
        {copyText && <CopyButton text={copyText} label={copyLabel} />}
        {added ? (
          <span
            className={`flex-1 inline-flex items-center justify-center gap-2 text-xs text-success ${TIER_3_SUCCESS}`}
          >
            <CheckCircle2 size={14} strokeWidth={2} />
            Added to project
          </span>
        ) : (
          <button
            type="button"
            onClick={onAddToProject}
            disabled={adding || exporting}
            className={`flex-1 ${BTN_SECONDARY}`}
          >
            {adding ? "Adding…" : addLabel}
          </button>
        )}
        {exported ? (
          <span
            className={`flex-1 inline-flex items-center justify-center gap-2 text-xs text-success ${TIER_3_SUCCESS}`}
          >
            <CheckCircle2 size={14} strokeWidth={2} />
            Exported
          </span>
        ) : (
          <button
            type="button"
            onClick={onExport}
            disabled={adding || exporting}
            className={`flex-1 ${BTN_PRIMARY}`}
          >
            {exporting ? (
              <>
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                Exporting…
              </>
            ) : (
              <>
                <FileOutput size={14} strokeWidth={2} />
                Export
              </>
            )}
          </button>
        )}
      </div>

      {addError && (
        <p className={ERROR_TEXT}>
          <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>{addError}</span>
        </p>
      )}

      {exportError && (
        <p className={ERROR_TEXT}>
          <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>{exportError}</span>
        </p>
      )}
    </div>
  );
}
