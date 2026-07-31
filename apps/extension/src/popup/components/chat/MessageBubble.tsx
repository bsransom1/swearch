import ChatMarkdown from "./ChatMarkdown";
import SwearchFavicon from "../SwearchFavicon";
import PapersMessage from "./PapersMessage";
import type { DiscoveredPaper } from "@swearch/shared/types/discovered-paper";
import { ASSISTANT_MESSAGE, USER_BUBBLE, WELCOME_BUBBLE } from "../../../lib/theme";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  kind?: "text" | "papers";
  papers?: DiscoveredPaper[];
  isLoading?: boolean;
  searchQuery?: string;
  papersTotal?: number;
  addedOpenalexIds?: string[];
}

interface Props {
  message: ChatMessage;
  showAssistantIcon?: boolean;
  activeProjectId?: string | null;
  onAddPaper?: (messageId: string, paper: DiscoveredPaper) => Promise<void>;
  addBusy?: boolean;
}

export default function MessageBubble({
  message,
  showAssistantIcon = false,
  activeProjectId = null,
  onAddPaper,
  addBusy,
}: Props) {
  const isUser = message.role === "user";
  const isWelcome = message.id === "welcome";

  if (isUser) {
    return (
      <div className="pl-5">
        <div className={USER_BUBBLE}>
          <ChatMarkdown content={message.content} variant="user" />
        </div>
      </div>
    );
  }

  if (message.kind === "papers") {
    const addedSet = new Set(message.addedOpenalexIds ?? []);
    return (
      <PapersMessage
        content={message.content}
        papers={message.papers ?? []}
        searchQuery={message.searchQuery}
        total={message.papersTotal}
        isLoading={message.isLoading}
        activeProjectId={activeProjectId}
        addedOpenalexIds={addedSet}
        onAddPaper={(paper) => onAddPaper?.(message.id, paper) ?? Promise.resolve()}
        addBusy={addBusy}
      />
    );
  }

  const messageClass = isWelcome ? WELCOME_BUBBLE : ASSISTANT_MESSAGE;

  return (
    <div className={messageClass}>
      {showAssistantIcon && !isWelcome ? (
        <div className="mb-2 flex items-center gap-1.5">
          <SwearchFavicon className="h-3.5 w-3.5 opacity-70" />
        </div>
      ) : null}
      <ChatMarkdown content={message.content} variant="assistant" />
    </div>
  );
}
