import ChatMarkdown from "./ChatMarkdown";
import { Sparkles } from "lucide-react";
import { ASSISTANT_BUBBLE, USER_BUBBLE, WELCOME_BUBBLE } from "../../../lib/theme";

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
  const isWelcome = message.id === "welcome";

  const bubbleClass = isUser
    ? USER_BUBBLE
    : isWelcome
      ? WELCOME_BUBBLE
      : ASSISTANT_BUBBLE;

  const showIcon = !isUser && showAssistantIcon;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={bubbleClass}>
        {showIcon ? (
          <div className="flex items-start gap-1.5">
            <Sparkles
              size={14}
              strokeWidth={2}
              className="flex-shrink-0 text-accent mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <ChatMarkdown content={message.content} variant="assistant" />
            </div>
          </div>
        ) : (
          <ChatMarkdown content={message.content} variant={isUser ? "user" : "assistant"} />
        )}
      </div>
    </div>
  );
}
