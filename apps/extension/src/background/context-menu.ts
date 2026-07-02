import {
  EXTENSION_CONTEXT_MENU_ACTIONS,
  MENU_IDS,
  MIN_SELECTION_LENGTH,
  MAX_SELECTION_LENGTH,
  SWEARCH_CONTEXT_MENU_ROOT_ID,
  actionTypeForMenuItemId,
} from "@swearch/shared/constants/extension-actions";
import { storage } from "../lib/storage";
import { getActiveProject } from "../lib/active-project";

const PANEL_SCRIPT = "content/panel-injector.js";

/** Changes on each service-worker restart so stale in-page panel state can be detected. */
const PANEL_SESSION = crypto.randomUUID();

function mainFrame(tabId: number): chrome.scripting.InjectionTarget {
  return { tabId, frameIds: [0] };
}

async function getActiveProjectName(): Promise<string | null> {
  const stored = await storage.get(["currentProjectName"]);
  if (stored.currentProjectName) return stored.currentProjectName;

  const project = await getActiveProject();
  return project?.name ?? null;
}

export async function registerContextMenus(): Promise<void> {
  const projectName = await getActiveProjectName();

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: SWEARCH_CONTEXT_MENU_ROOT_ID,
      title: "Swearch",
      contexts: ["selection"],
    });

    for (const action of EXTENSION_CONTEXT_MENU_ACTIONS) {
      const title =
        action.dynamicLabel && projectName
          ? action.dynamicLabel(projectName)
          : action.label;

      chrome.contextMenus.create({
        id: action.menuItemId,
        parentId: SWEARCH_CONTEXT_MENU_ROOT_ID,
        title,
        contexts: ["selection"],
      });

      // Separator before Copy formatted
      if (action.menuItemId === MENU_IDS.EXTRACT_CLAIMS) {
        chrome.contextMenus.create({
          id: "swearch-separator",
          parentId: SWEARCH_CONTEXT_MENU_ROOT_ID,
          type: "separator",
          contexts: ["selection"],
        });
      }
    }
  });
}

/** Call this when the active project changes so menu titles stay accurate. */
export async function refreshMenuTitles(): Promise<void> {
  const projectName = await getActiveProjectName();

  for (const action of EXTENSION_CONTEXT_MENU_ACTIONS) {
    if (!action.dynamicLabel) continue;
    const title = projectName ? action.dynamicLabel(projectName) : action.label;
    try {
      chrome.contextMenus.update(action.menuItemId, { title });
    } catch {
      // Menus may not be registered yet on first call
    }
  }
}

function capturePageContext(fallbackSelection: string): {
  selection: string;
  title: string;
} {
  const live = window.getSelection()?.toString().trim() ?? "";
  const selection =
    live.length >= fallbackSelection.length ? live : fallbackSelection;

  const title =
    document.querySelector('meta[name="citation_title"]')?.getAttribute("content") ||
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
    document.querySelector("h1.title")?.textContent?.trim() ||
    document.querySelector("h1[data-article-title]")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    document.title?.replace(/ [-|–] .*$/, "").trim() ||
    "Untitled Article";

  return { selection, title: title.trim() };
}

function openPanel(detail: object): void {
  const w = window as Window & {
    __swearchOpenPanel?: (d: object) => void;
    __swearchPendingActions?: object[];
  };
  if (typeof w.__swearchOpenPanel === "function") {
    w.__swearchOpenPanel(detail);
    return;
  }
  const queue = w.__swearchPendingActions ?? [];
  w.__swearchPendingActions = queue;
  queue.push(detail);
}

async function ensurePanelInjected(tabId: number): Promise<void> {
  const [{ result: ready }] = await chrome.scripting.executeScript({
    target: mainFrame(tabId),
    func: (expectedSession: string) => {
      const w = window as Window & {
        __swearchOpenPanel?: unknown;
        __swearchPanelSession?: string;
        __swearchPanelHost?: unknown;
        __swearchPanelRoot?: { unmount?: () => void };
        __swearchActionBus?: unknown;
      };
      const host = document.getElementById("swearch-panel-host");
      const healthy =
        !!host &&
        w.__swearchPanelSession === expectedSession &&
        typeof w.__swearchOpenPanel === "function";

      if (host && !healthy) {
        w.__swearchPanelRoot?.unmount?.();
        host.remove();
        delete w.__swearchPanelHost;
        delete w.__swearchPanelRoot;
        delete w.__swearchActionBus;
        delete w.__swearchOpenPanel;
        delete w.__swearchPanelSession;
      }

      return (
        !!document.getElementById("swearch-panel-host") &&
        w.__swearchPanelSession === expectedSession &&
        typeof w.__swearchOpenPanel === "function"
      );
    },
    args: [PANEL_SESSION],
  });

  if (ready) return;

  await chrome.scripting.executeScript({
    target: mainFrame(tabId),
    files: [PANEL_SCRIPT],
  });

  for (let attempt = 0; attempt < 20; attempt++) {
    const [{ result: ok }] = await chrome.scripting.executeScript({
      target: mainFrame(tabId),
      func: (expectedSession: string) => {
        const w = window as Window & {
          __swearchOpenPanel?: unknown;
          __swearchPanelSession?: string;
        };
        if (typeof w.__swearchOpenPanel !== "function") return false;
        w.__swearchPanelSession = expectedSession;
        return true;
      },
      args: [PANEL_SESSION],
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 25));
  }
}

function copyAndToast(text: string, toastText: string): void {
  // Executed in page context — handles copy_formatted without the panel
  navigator.clipboard.writeText(text).catch(() => {});

  const existingToast = document.getElementById("swearch-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.id = "swearch-toast";
  toast.textContent = toastText;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    background: "#111111",
    color: "#f0f0f0",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    transition: "opacity 0.3s",
    opacity: "1",
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

export function setupContextMenuListeners(): void {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    const actionType = actionTypeForMenuItemId(String(info.menuItemId));
    if (!actionType) return;

    const infoText = info.selectionText?.trim() ?? "";
    if (infoText.length < MIN_SELECTION_LENGTH) {
      console.warn(`[Swearch] Selection too short (${infoText.length} chars)`);
      return;
    }

    // Prefer live selection (info.selectionText can be truncated in some Chrome versions)
    let selectionText = infoText;
    let paperTitle = tab.title?.replace(/ [-|–] .*$/, "").trim() || "";
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: mainFrame(tab.id),
        func: capturePageContext,
        args: [infoText],
      });
      if (result?.selection) selectionText = result.selection;
      if (result?.title) paperTitle = result.title;
    } catch {
      // Page may not allow scripting; fall back to info.selectionText
    }

    // Truncate very long selections
    const truncated = selectionText.length > MAX_SELECTION_LENGTH;
    const finalText = truncated
      ? selectionText.slice(0, MAX_SELECTION_LENGTH)
      : selectionText;

    // ── copy_formatted: no panel needed ──────────────────────────────────────
    if (actionType === "copy_formatted") {
      const formatted = [
        `"${finalText}"`,
        ``,
        `Source: ${tab.url}`,
        `Page: ${tab.title || "Unknown"}`,
        `Captured: ${new Date().toLocaleString()}`,
      ].join("\n");

      const toastText = "Copied ✓";
      try {
        await chrome.scripting.executeScript({
          target: mainFrame(tab.id),
          func: copyAndToast,
          args: [formatted, toastText],
        });
      } catch (err) {
        console.error("[Swearch] copy_formatted failed:", err);
      }
      return;
    }

    // ── all other actions: inject panel (once) then open ───────────────────
    const detail = {
      action: actionType,
      selectionText: finalText,
      truncated,
      paperTitle,
      paperUrl: tab.url ?? "",
      paperDoi: null as string | null,
      timestamp: new Date().toISOString(),
    };

    try {
      // Queue/open first so the action survives panel script load races.
      await chrome.scripting.executeScript({
        target: mainFrame(tab.id),
        func: openPanel,
        args: [detail],
      });

      await ensurePanelInjected(tab.id);
    } catch (err) {
      console.error("[Swearch] Failed to open panel:", err);
      await chrome.scripting
        .executeScript({
          target: mainFrame(tab.id),
          func: (msg: string) => console.error("[Swearch]", msg),
          args: [
            err instanceof Error
              ? err.message
              : "Panel failed to open — reload the extension at chrome://extensions",
          ],
        })
        .catch(() => {});
      return;
    }

    // Best-effort DOI extraction — fire and forget
    chrome.scripting
      .executeScript({
        target: mainFrame(tab.id),
        func: () =>
          document.querySelector("[data-doi]")?.getAttribute("data-doi") ||
          document
            .querySelector('meta[name="citation_doi"]')
            ?.getAttribute("content") ||
          window.location.href.match(/10\.\d{4,9}\/[^\s"<>]+/)?.[0] ||
          null,
      })
      .then(([{ result }]) => {
        if (result) detail.paperDoi = result;
      })
      .catch(() => {});
  });
}
