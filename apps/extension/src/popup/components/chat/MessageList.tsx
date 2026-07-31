import { useEffect, useRef } from "react";
import MessageBubble, { type ChatMessage } from "./MessageBubble";
import type { DiscoveredPaper } from "@swearch/shared/types/discovered-paper";
import { SPINNER } from "../../../lib/theme";
import { useShellMode } from "../../lib/shell-mode";

interface Props {
  messages: ChatMessage[];
  isThinking: boolean;
  activeProjectId?: string | null;
  onAddPaper?: (messageId: string, paper: DiscoveredPaper) => Promise<void>;
  addBusy?: boolean;
}

export default function MessageList({
  messages,
  isThinking,
  activeProjectId,
  onAddPaper,
  addBusy,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSidebar = useShellMode() === "sidebar";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isThinking]);

  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto py-4 space-y-6 ${
        isSidebar ? "px-5 text-[15px]" : "px-3"
      }`}
    >
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          showAssistantIcon={
            msg.role === "assistant" &&
            msg.kind !== "papers" &&
            (i === 0 || messages[i - 1]?.role === "user")
          }
          activeProjectId={activeProjectId}
          onAddPaper={onAddPaper}
          addBusy={addBusy}
        />
      ))}
      {isThinking && (
        <div className="flex items-center gap-2 px-0.5 text-xs text-text-tertiary">
          <div className={SPINNER} />
          Thinking…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
