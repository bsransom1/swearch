import type { ReactNode } from "react";
import {
  POPUP_HEIGHT,
  POPUP_RADIUS,
  POPUP_WIDTH,
  SIDEBAR_RADIUS,
} from "../constants";
import type { ShellMode } from "../lib/shell-mode";

interface AppShellProps {
  mode: ShellMode;
  children: ReactNode;
}

/** Shared app frame — compact popup or full-height sidebar shell. */
export default function AppShell({ mode, children }: AppShellProps) {
  const isSidebar = mode === "sidebar";

  return (
    <div
      className="flex flex-col bg-surface-bg text-text-primary font-sans overflow-hidden"
      style={
        isSidebar
          ? {
              width: "100%",
              height: "100vh",
              minWidth: 0,
              minHeight: 0,
              borderRadius: SIDEBAR_RADIUS,
            }
          : {
              width: POPUP_WIDTH,
              height: POPUP_HEIGHT,
              minWidth: POPUP_WIDTH,
              minHeight: POPUP_HEIGHT,
              borderRadius: POPUP_RADIUS,
            }
      }
    >
      {children}
    </div>
  );
}
