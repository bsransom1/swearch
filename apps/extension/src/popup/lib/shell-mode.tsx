import { createContext, useContext, type ReactNode } from "react";

export type ShellMode = "popup" | "sidebar";

const ShellModeContext = createContext<ShellMode>("popup");

export function getShellModeFromLocation(): ShellMode {
  const shell = new URLSearchParams(window.location.search).get("shell");
  return shell === "sidebar" ? "sidebar" : "popup";
}

export function ShellModeProvider({
  mode,
  children,
}: {
  mode: ShellMode;
  children: ReactNode;
}) {
  return (
    <ShellModeContext.Provider value={mode}>{children}</ShellModeContext.Provider>
  );
}

export function useShellMode(): ShellMode {
  return useContext(ShellModeContext);
}

export function closeSidebarFromIframe(): void {
  if (window.parent !== window) {
    window.parent.postMessage({ type: "SWEARCH_CLOSE_SIDEBAR" }, "*");
  }
}
