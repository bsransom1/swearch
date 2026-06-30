import { useEffect, useRef } from "react";
import MessageBubble, { type ChatMessage } from "./MessageBubble";
import { SPINNER } from "../../../lib/theme";

interface Props {
  messages: ChatMessage[];
  isThinking: boolean;
}

export default function MessageList({ messages, isThinking }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          showAssistantIcon={
            msg.role === "assistant" &&
            (i === 0 || messages[i - 1]?.role === "user")
          }
        />
      ))}
      {isThinking && (
        <div className="flex items-center gap-2 text-text-tertiary text-xs">
          <div className={SPINNER} />
          Thinking…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
