import { Brain, ChevronDown, RefreshCw, Settings } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface Props {
  onSettings: () => void;
  activeProject: Project | null;
  projectLoading: boolean;
  onChangeProject: () => void;
  onClearChat: () => void;
  isLikelyPaper: boolean;
  onOpenRelatedPapers: () => void;
}

export default function ChatHeader({
  onSettings,
  activeProject,
  projectLoading,
  onChangeProject,
  onClearChat,
  isLikelyPaper,
  onOpenRelatedPapers,
}: Props) {
  const projectLabel = activeProject?.name ?? "No active project";

  return (
    <div className="border-b border-border-subtle flex-shrink-0 px-4 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
            S
          </div>
          <span className="font-medium text-sm text-text-primary flex-shrink-0">Swearch</span>

          <button
            type="button"
            onClick={onChangeProject}
            className="inline-flex items-center gap-1 min-w-0 max-w-[9.5rem] pl-2.5 pr-1.5 py-1 rounded-full bg-surface-1 border border-border-subtle shadow-tier-2 hover:bg-surface-2 hover:border-border-default transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60"
            title="Change active project"
            aria-label={`Active project: ${projectLabel}. Click to change.`}
          >
            {projectLoading ? (
              <span className="h-3.5 w-16 bg-surface-2 rounded-full animate-pulse" />
            ) : (
              <span className="text-xs text-text-secondary truncate min-w-0 flex-1 text-center">
                {projectLabel}
              </span>
            )}
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-surface-2 text-text-tertiary">
              <ChevronDown size={12} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onClearChat}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-1 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60"
            title="Clear conversation"
            aria-label="Clear conversation"
          >
            <RefreshCw size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onOpenRelatedPapers}
            disabled={!isLikelyPaper}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-1 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-tertiary"
            title={
              isLikelyPaper
                ? "Find related papers on this page"
                : "Open a research paper to find related work"
            }
            aria-label={
              isLikelyPaper
                ? "Find related papers"
                : "Find related papers (unavailable on this page)"
            }
          >
            <Brain size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onSettings}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-1 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-accent/60"
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
