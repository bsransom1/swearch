import type { ReactNode } from "react";
import { POPUP_HEIGHT, POPUP_RADIUS, POPUP_WIDTH } from "../constants";

interface PopupShellProps {
  children: ReactNode;
}

/** Shared fixed-size popup frame so view switches never resize the extension window. */
export default function PopupShell({ children }: PopupShellProps) {
  return (
    <div
      className="flex flex-col bg-surface-0 text-text-primary font-sans overflow-hidden"
      style={{
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        minWidth: POPUP_WIDTH,
        minHeight: POPUP_HEIGHT,
        borderRadius: POPUP_RADIUS,
      }}
    >
      {children}
    </div>
  );
}
