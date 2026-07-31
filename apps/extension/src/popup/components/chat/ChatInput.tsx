import { useState, useRef, type KeyboardEvent } from "react";
import { Lightbulb } from "lucide-react";
import { useShellMode } from "../../lib/shell-mode";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask about your research…",
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSidebar = useShellMode() === "sidebar";

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className={`mt-auto flex-shrink-0 py-3 ${isSidebar ? "px-5" : "px-4"}`}>
      <div
        className="flex w-full items-end gap-2 rounded-full border border-border-subtle bg-surface-0 py-1.5 pl-4 pr-1.5 shadow-tier-2 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={`${
            isSidebar ? "min-h-[44px] text-[15px]" : "min-h-[36px] text-sm"
          } max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent py-2 leading-snug text-text-primary placeholder:text-text-tertiary focus:outline-none disabled:opacity-60`}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-btn-primary transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Lightbulb size={13} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
