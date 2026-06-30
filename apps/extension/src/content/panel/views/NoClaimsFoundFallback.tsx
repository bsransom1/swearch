import type { ExtensionActionType } from "@swearch/shared/constants/extension-actions";

type SwitchableAction = Extract<
  ExtensionActionType,
  "summarize" | "ask" | "relevance"
>;

interface ActionPayload {
  selectionText: string;
  paperTitle: string;
  paperUrl: string;
}

interface NoClaimsFoundFallbackProps {
  payload: ActionPayload;
  onSwitchAction: (action: SwitchableAction) => void;
}

const ALTERNATIVES: {
  action: SwitchableAction;
  label: string;
  description: string;
}[] = [
  {
    action: "summarize",
    label: "Summarize",
    description: "Get the full structured analysis (findings, methodology, limitations)",
  },
  {
    action: "ask",
    label: "Ask a question",
    description: "“What’s the main argument here?” or “What does this claim?”",
  },
  {
    action: "relevance",
    label: "Check relevance",
    description: "See how this relates to your project",
  },
];

export default function NoClaimsFoundFallback({
  payload: _payload,
  onSwitchAction,
}: NoClaimsFoundFallbackProps) {
  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="text-center py-2">
        <p className="text-sm text-text-secondary">
          No distinct claims found in this selection.
        </p>
        <p className="text-xs text-text-tertiary mt-1">
          This text might be mostly descriptive or contextual.
        </p>
      </div>

      <div className="border border-border-subtle rounded-lg p-3 space-y-2">
        <p className="text-xs text-text-tertiary">
          Try instead:
        </p>
        <div className="space-y-2">
          {ALTERNATIVES.map(({ action, label, description }) => (
            <button
              key={action}
              type="button"
              onClick={() => onSwitchAction(action)}
              className="w-full text-left px-3 py-2 rounded-md bg-surface-2 hover:bg-surface-3 border border-border-subtle hover:border-border-default transition-colors duration-150 group focus:outline-none focus:ring-2 focus:ring-accent/60"
            >
              <span className="block text-xs font-medium text-text-primary group-hover:text-accent">
                {label}
              </span>
              <span className="block text-xs text-text-tertiary mt-1 leading-relaxed">
                {description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-text-tertiary text-center leading-relaxed">
        Tip: Clear argumentative text (&ldquo;we argue that&hellip;&rdquo;, &ldquo;this
        shows&hellip;&rdquo;) works best for claim extraction.
      </p>
    </div>
  );
}
