export const PANEL_WIDTH = 380;
export const PANEL_HEIGHT_ESTIMATE = 400;
export const PANEL_GAP = 12;

export interface SelectionRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  isVisible: boolean;
  isMultiLine: boolean;
}

export interface PanelPosition {
  top: number;
  left: number;
  placement: "below" | "above" | "fixed-corner";
  connectorVisible: boolean;
  connectorPosition?: {
    type: "top" | "bottom";
    horizontalPercent: number;
  };
}

/** Get the bounding rect of the currently selected text (viewport coordinates). */
export function getSelectionRect(): SelectionRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) return null;

  const isVisible =
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0;

  const isMultiLine = rect.height > 24;

  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
    isVisible,
    isMultiLine,
  };
}

function connectorForSelection(
  selectionRect: SelectionRect,
  panelLeft: number,
  panelWidth: number,
  edge: "top" | "bottom"
): PanelPosition["connectorPosition"] {
  const anchorX = selectionRect.left + selectionRect.width / 2;
  const horizontalPercent = Math.max(
    12,
    Math.min(88, ((anchorX - panelLeft) / panelWidth) * 100)
  );
  return { type: edge, horizontalPercent };
}

export function calculatePanelPosition(
  selectionRect: SelectionRect | null,
  panelWidth: number = PANEL_WIDTH,
  panelHeight: number = PANEL_HEIGHT_ESTIMATE,
  gap: number = PANEL_GAP
): PanelPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!selectionRect || !selectionRect.isVisible) {
    return {
      top: Math.max(10, viewportHeight - panelHeight - 20),
      left: Math.max(10, viewportWidth - panelWidth - 20),
      placement: "fixed-corner",
      connectorVisible: false,
    };
  }

  const spaceBelow = viewportHeight - selectionRect.bottom;
  const spaceAbove = selectionRect.top;

  let top: number;
  let placement: "below" | "above" = "below";
  let connectorPosition: PanelPosition["connectorPosition"];

  if (spaceBelow >= panelHeight + gap) {
    top = selectionRect.bottom + gap;
    placement = "below";
    connectorPosition = connectorForSelection(selectionRect, 0, panelWidth, "top");
  } else if (spaceAbove >= panelHeight + gap) {
    top = selectionRect.top - panelHeight - gap;
    placement = "above";
    connectorPosition = connectorForSelection(selectionRect, 0, panelWidth, "bottom");
  } else if (selectionRect.top < viewportHeight / 2) {
    top = selectionRect.bottom + gap;
    placement = "below";
    connectorPosition = undefined;
  } else {
    top = Math.max(10, selectionRect.top - panelHeight - gap);
    placement = "above";
    connectorPosition = undefined;
  }

  let left = selectionRect.left;
  if (left + panelWidth > viewportWidth - 10) {
    left = viewportWidth - panelWidth - 10;
  }
  if (left < 10) left = 10;

  const rawTop = top;
  const constrainedTop = Math.max(10, Math.min(top, viewportHeight - panelHeight - 10));

  if (connectorPosition) {
    connectorPosition = connectorForSelection(selectionRect, left, panelWidth, connectorPosition.type);
  }

  const positionClamped = Math.abs(constrainedTop - rawTop) >= 5;

  return {
    top: constrainedTop,
    left,
    placement,
    connectorVisible: connectorPosition !== undefined && !positionClamped,
    connectorPosition: positionClamped ? undefined : connectorPosition,
  };
}

export function applyPanelPosition(host: HTMLElement, position: PanelPosition): void {
  host.style.top = `${position.top}px`;
  host.style.left = `${position.left}px`;
}

export function getPanelHost(): HTMLElement | null {
  return document.getElementById("swearch-panel-host");
}
