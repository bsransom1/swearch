import { PROJECT_BADGE } from "../../../lib/theme";

interface Project {
  id: string;
  name: string;
  google_doc_title: string | null;
}

interface Props {
  onSettings: () => void;
  activeProject: Project | null;
  projectLoading: boolean;
  onChangeProject: () => void;
  onClearChat: () => void;
}

export default function ChatHeader({
  onSettings,
  activeProject,
  projectLoading,
  onChangeProject,
  onClearChat,
}: Props) {
  return (
    <div className="border-b border-border-subtle flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
            S
          </div>
          <span className="font-medium text-sm text-text-primary">Swearch</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClearChat}
            className="text-text-tertiary hover:text-text-primary text-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60 rounded px-1"
            title="Clear conversation"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="text-text-tertiary hover:text-text-primary text-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60 rounded px-1"
          >
            Settings
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onChangeProject}
        className="w-full flex items-center justify-between gap-2 px-4 py-2 border-t border-border-subtle hover:bg-surface-1 transition-colors duration-150 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/60"
      >
        <div className="min-w-0 flex-1">
          {projectLoading ? (
            <div className="h-4 w-28 bg-surface-2 rounded animate-pulse" />
          ) : (
            <span className={`${PROJECT_BADGE} max-w-full truncate`}>
              {activeProject?.name ?? "No active project"}
            </span>
          )}
        </div>
        <span className="text-text-tertiary text-xs flex-shrink-0">Change ▾</span>
      </button>
    </div>
  );
}
