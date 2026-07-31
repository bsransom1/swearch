const SIDEBAR_HOST_ID = "swearch-sidebar-host";

declare global {
  interface Window {
    __swearchToggleSidebar?: () => boolean;
    __swearchCloseSidebar?: () => void;
    __swearchClosePanel?: () => void;
    __swearchSidebarResizeObserver?: ResizeObserver;
  }
}

function isSidebarOpen(): boolean {
  return !!document.getElementById(SIDEBAR_HOST_ID);
}

function applyPagePush(width: number): void {
  document.documentElement.style.marginRight = `${width}px`;
  document.documentElement.style.transition = "margin-right 200ms ease";
  document.documentElement.dataset.swearchSidebarOpen = "true";
}

function clearPagePush(): void {
  document.documentElement.style.marginRight = "";
  document.documentElement.style.transition = "";
  delete document.documentElement.dataset.swearchSidebarOpen;
}

function syncPagePush(host: HTMLElement): void {
  applyPagePush(host.getBoundingClientRect().width);
}

function closeSidebar(): void {
  window.__swearchSidebarResizeObserver?.disconnect();
  delete window.__swearchSidebarResizeObserver;

  document.getElementById(SIDEBAR_HOST_ID)?.remove();
  clearPagePush();
}

function createSidebarHost(): HTMLElement {
  const host = document.createElement("div");
  host.id = SIDEBAR_HOST_ID;
  host.style.cssText = [
    "position:fixed",
    "top:0",
    "right:0",
    "height:100vh",
    "width:min(480px,28vw)",
    "min-width:360px",
    "z-index:2147483646",
    "border-radius:0",
    "border-left:1px solid #d0d0d0",
    "background:#f8f8f8",
    "box-shadow:-4px 0 24px rgba(0,0,0,0.08)",
    "display:flex",
    "flex-direction:column",
    "overflow:hidden",
  ].join(";");

  const iframe = document.createElement("iframe");
  iframe.title = "Swearch";
  iframe.src = chrome.runtime.getURL("src/popup/index.html?shell=sidebar");
  iframe.style.cssText = "width:100%;height:100%;border:0;border-radius:0;flex:1;";
  host.appendChild(iframe);

  return host;
}

function closeContextPanel(): void {
  window.__swearchClosePanel?.();
}

function openSidebar(): void {
  if (isSidebarOpen()) return;

  closeContextPanel();

  const host = createSidebarHost();
  document.body.appendChild(host);

  requestAnimationFrame(() => {
    syncPagePush(host);

    const observer = new ResizeObserver(() => {
      if (document.getElementById(SIDEBAR_HOST_ID)) {
        syncPagePush(host);
      }
    });
    observer.observe(host);
    window.__swearchSidebarResizeObserver = observer;
  });
}

function toggleSidebar(): boolean {
  if (isSidebarOpen()) {
    closeSidebar();
    return false;
  }
  openSidebar();
  return true;
}

window.__swearchToggleSidebar = toggleSidebar;
window.__swearchCloseSidebar = closeSidebar;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SWEARCH_TOGGLE_SIDEBAR") {
    const open = toggleSidebar();
    sendResponse({ open });
    return true;
  }
  if (message?.type === "SWEARCH_CLOSE_SIDEBAR") {
    closeSidebar();
    sendResponse({ open: false });
    return true;
  }
  return false;
});

window.addEventListener("message", (event) => {
  if (event.data?.type === "SWEARCH_CLOSE_SIDEBAR") {
    closeSidebar();
  }
});

window.addEventListener("pagehide", () => {
  if (isSidebarOpen()) closeSidebar();
});

export {};
