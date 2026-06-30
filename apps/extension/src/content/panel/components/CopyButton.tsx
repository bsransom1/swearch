import { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { BTN_SECONDARY, SUCCESS_TEXT } from "../../../lib/theme";

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export default function CopyButton({
  text,
  label = "Copy",
  size = "sm",
  className = "",
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.error("[Swearch] Copy failed:", e);
    }
  }

  const sizeClass =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-3 py-2 text-sm";

  if (isCopied) {
    return (
      <span className={`${SUCCESS_TEXT} ${sizeClass} ${className}`}>
        <CheckCircle2 size={14} strokeWidth={2} className="flex-shrink-0" />
        Copied
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${BTN_SECONDARY} ${sizeClass} ${className}`}
      title="Copy to clipboard"
      aria-label={label}
    >
      <Copy size={14} strokeWidth={2} />
      {label}
    </button>
  );
}
