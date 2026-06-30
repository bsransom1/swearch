export type ExtensionActionType =
  | "summarize"
  | "ask"
  | "relevance"
  | "add"
  | "extract_claims"
  | "copy_formatted";

export interface PendingActionPayload {
  selectedText: string;
  paperTitle: string;
  paperUrl: string;
  paperDoi: string | null;
  timestamp: string;
}

export interface PendingAction {
  type: ExtensionActionType;
  payload: PendingActionPayload;
}

export const MIN_SELECTION_LENGTH = 20;
export const MAX_SELECTION_LENGTH = 6000;

export const SWEARCH_CONTEXT_MENU_ROOT_ID = "swearch-root";

export const MENU_IDS = {
  PARENT: SWEARCH_CONTEXT_MENU_ROOT_ID,
  SUMMARIZE: "swearch-summarize",
  ASK: "swearch-ask",
  RELEVANCE: "swearch-relevance",
  ADD: "swearch-add",
  EXTRACT_CLAIMS: "swearch-extract-claims",
  COPY_FORMATTED: "swearch-copy-formatted",
} as const;

interface MenuAction {
  type: ExtensionActionType;
  menuItemId: string;
  label: string;
  dynamicLabel?: (projectName: string) => string;
}

export const EXTENSION_CONTEXT_MENU_ACTIONS: MenuAction[] = [
  {
    type: "summarize",
    menuItemId: MENU_IDS.SUMMARIZE,
    label: "Summarize selection",
  },
  {
    type: "ask",
    menuItemId: MENU_IDS.ASK,
    label: "Ask Swearch about this...",
  },
  {
    type: "relevance",
    menuItemId: MENU_IDS.RELEVANCE,
    label: "Check relevance to project",
    dynamicLabel: (name) => `Check relevance to ${name}`,
  },
  {
    type: "add",
    menuItemId: MENU_IDS.ADD,
    label: "Add to project",
    dynamicLabel: (name) => `Add to ${name}`,
  },
  {
    type: "extract_claims",
    menuItemId: MENU_IDS.EXTRACT_CLAIMS,
    label: "Extract key claims",
  },
  {
    type: "copy_formatted",
    menuItemId: MENU_IDS.COPY_FORMATTED,
    label: "Copy formatted",
  },
];

export function actionTypeForMenuItemId(
  menuItemId: string
): ExtensionActionType | null {
  const action = EXTENSION_CONTEXT_MENU_ACTIONS.find(
    (item) => item.menuItemId === menuItemId
  );
  return action?.type ?? null;
}
