import { useRef, useState } from "react";
import { AlertCircle, Send, Sparkles } from "lucide-react";
import CopyButton from "../components/CopyButton";
import { bridge, type ActiveProject } from "../lib/bridge";
import {
  ASSISTANT_BUBBLE,
  BTN_PRIMARY,
  ERROR_TEXT,
  INPUT_FIELD,
  QUOTE_BLOCK,
  SECTION_LABEL,
  USER_BUBBLE,
} from "../../../lib/theme";

interface ActionPayload {
  selectionText: string;
  paperTitle: string;
  paperUrl: string;
}

interface QAPair {
  question: string;
  answer: string;
}

interface Props {
  payload: ActionPayload;
  project: ActiveProject | null;
}

export default function AskView({ payload, project }: Props) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<QAPair[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    setAsking(true);
    setError(null);

    try {
      const { answer } = await bridge.ask({
        selectionText: payload.selectionText,
        question: q,
        paperTitle: payload.paperTitle,
        paperUrl: payload.paperUrl,
        projectContext: project?.context ?? "",
        projectName: project?.name ?? "Research Project",
      });

      setThread((prev) => [...prev, { question: q, answer }]);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setAsking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border-subtle">
        <p className={`${SECTION_LABEL} mb-1`}>
          <span>Selection</span>
        </p>
        <p className={`${QUOTE_BLOCK} line-clamp-3`}>
          &ldquo;{payload.selectionText.slice(0, 200)}
          {payload.selectionText.length > 200 ? "…" : ""}&rdquo;
        </p>
      </div>

      {thread.length > 0 && (
        <div className="p-3 space-y-3 border-b border-border-subtle max-h-56 overflow-y-auto">
          {thread.map((qa, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-end">
                <div className={USER_BUBBLE}>{qa.question}</div>
              </div>
              <div className="flex justify-start">
                <div className={ASSISTANT_BUBBLE}>
                  <p className="flex items-center gap-2 text-accent mb-1.5">
                    <Sparkles size={14} strokeWidth={2} className="flex-shrink-0" />
                  </p>
                  {qa.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 space-y-2">
        {error && (
          <p className={ERROR_TEXT}>
            <AlertCircle size={14} strokeWidth={2} className="flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          placeholder="Ask a question about this selection…"
          disabled={asking}
          rows={3}
          className={`w-full resize-none disabled:opacity-60 ${INPUT_FIELD}`}
        />
        <button
          type="submit"
          disabled={!question.trim() || asking}
          className={`w-full ${BTN_PRIMARY}`}
        >
          <Send size={16} strokeWidth={2} />
          {asking ? "Asking…" : "Ask"}
        </button>
      </form>

      {thread.length > 0 && (
        <div className="px-3 pb-3 flex gap-2">
          <CopyButton
            text={thread.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n\n")}
            label="Copy Q&A"
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}
