import { AlertCircle } from "lucide-react";
import { BTN_SECONDARY, ERROR_TEXT } from "../../../lib/theme";

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorView({ message, onRetry }: Props) {
  return (
    <div className="p-3">
      <div className={`${ERROR_TEXT} bg-surface-2 border border-error/40 rounded-lg p-3`}>
        <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0 mt-0.5" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`mt-3 w-full ${BTN_SECONDARY}`}
        >
          Retry
        </button>
      )}
    </div>
  );
}
