import { PROJECT_BADGE } from "../../../lib/theme";

interface Project {
  id: string;
  name: string;
  google_doc_title: string | null;
}

type Tab = "chat" | "session";

interface Props {
  onSettings: () => void;
  activeProject: Project | null;
  projectLoading: boolean;
  onChangeProject: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onClearChat: () => void;
}

export default function ChatHeader({
  onSettings,
  activeProject,
  projectLoading,
  onChangeProject,
  activeTab,
  onTabChange,
  onClearChat,
}: Props) {
  return (
    <div className="border-b border-border-subtle flex-shrink-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-xs font-medium text-white">
            S
          </div>
          <span className="font-medium text-sm text-text-primary">Swearch</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearChat}
            className="text-text-tertiary hover:text-text-secondary text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 rounded px-1"
            title="Clear conversation"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="text-text-tertiary hover:text-text-secondary text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 rounded px-1"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Active project row */}
      <button
        type="button"
        onClick={onChangeProject}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-1 hover:bg-surface-2 transition-colors text-left border-t border-border-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/60"
      >
        <div className="min-w-0">
          <p className="text-xs text-text-tertiary mb-1">Active project</p>
          {projectLoading ? (
            <div className="h-4 w-28 bg-surface-2 rounded animate-pulse" />
          ) : (
            <span className={`${PROJECT_BADGE} max-w-full truncate`}>
              {activeProject?.name ?? "No active project"}
            </span>
          )}
        </div>
        <span className="text-text-tertiary text-xs ml-2 flex-shrink-0">Change ▾</span>
      </button>

      {/* Tabs */}
      <div className="flex border-t border-border-subtle">
        {(["chat", "session"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={`flex-1 py-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/60 ${
              activeTab === tab
                ? "text-accent border-b-2 border-accent"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab === "chat" ? "Chat" : "This Session"}
          </button>
        ))}
      </div>
    </div>
  );
}
