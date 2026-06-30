import ChatMarkdown from "./ChatMarkdown";
import { Sparkles } from "lucide-react";
import { ASSISTANT_BUBBLE, USER_BUBBLE } from "../../../lib/theme";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Props {
  message: ChatMessage;
  showAssistantIcon?: boolean;
}

export default function MessageBubble({ message, showAssistantIcon = false }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={isUser ? USER_BUBBLE : ASSISTANT_BUBBLE}>
        {!isUser && showAssistantIcon && (
          <p className="flex items-center gap-2 text-accent mb-1.5">
            <Sparkles size={14} strokeWidth={2} className="flex-shrink-0" />
          </p>
        )}
        <ChatMarkdown content={message.content} variant={isUser ? "user" : "assistant"} />
      </div>
    </div>
  );
}
