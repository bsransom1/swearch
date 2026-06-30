import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import PanelRoot from "./panel/PanelRoot";
import panelStyles from "./panel/panel-entry.css?inline";
import containerStyles from "./panel/panel-container.css?inline";
import { dispatchAction, drainExternalPending } from "./panel/lib/action-bus";
import { PANEL_WIDTH } from "./panel/lib/position-calculator";

const PANEL_HOST_ID = "swearch-panel-host";

declare global {
  interface Window {
    __swearchOpenPanel?: (detail: import("./panel/lib/action-bus").ActionPayload) => void;
    __swearchPanelHost?: HTMLElement;
    __swearchPanelRoot?: Root;
  }
}

/** Register opener immediately so background can call it even while React bootstraps. */
window.__swearchOpenPanel = dispatchAction;

function isPanelHealthy(): boolean {
  return (
    !!document.getElementById(PANEL_HOST_ID) &&
    typeof window.__swearchOpenPanel === "function" &&
    !!window.__swearchPanelRoot
  );
}

function teardownPanel(): void {
  window.__swearchPanelRoot?.unmount();
  delete window.__swearchPanelRoot;
  document.getElementById(PANEL_HOST_ID)?.remove();
  delete window.__swearchPanelHost;
  delete (window as Window & { __swearchActionBus?: unknown }).__swearchActionBus;
}

const PANEL_RADIUS = 16;

function mountPanel(): void {
  if (isPanelHealthy()) return;

  teardownPanel();

  if (!document.body) {
    console.error("[Swearch] document.body not ready — cannot mount panel");
    return;
  }

  try {
    const host = document.createElement("div");
    host.id = PANEL_HOST_ID;
    host.style.cssText = [
      "position:fixed",
      "z-index:2147483647",
      `width:${PANEL_WIDTH}px`,
      "max-height:70vh",
      "pointer-events:auto",
      "top:0",
      "left:0",
      `border-radius:${PANEL_RADIUS}px`,
      "overflow:hidden",
      "filter:drop-shadow(0 8px 24px rgba(0,0,0,0.1))",
    ].join(";");

    document.body.appendChild(host);
    window.__swearchPanelHost = host;

    const shadowRoot = host.attachShadow({ mode: "open" });

    const styleEl = document.createElement("style");
    styleEl.textContent = `${panelStyles}\n${containerStyles}`;
    shadowRoot.appendChild(styleEl);

    const mountEl = document.createElement("div");
    mountEl.style.cssText = `width:100%;height:100%;border-radius:${PANEL_RADIUS}px;overflow:hidden;`;
    shadowRoot.appendChild(mountEl);

    const root = createRoot(mountEl);
    window.__swearchPanelRoot = root;
    root.render(createElement(PanelRoot, { hostElement: host }));
    console.info("[Swearch] Panel mounted");
  } catch (err) {
    console.error("[Swearch] Panel mount failed:", err);
    teardownPanel();
  }
}

try {
  mountPanel();
  drainExternalPending();
} catch (err) {
  console.error("[Swearch] Panel injector init failed:", err);
}
