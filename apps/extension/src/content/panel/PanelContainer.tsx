import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import type { PanelPosition } from "./lib/position-calculator";

const ACTION_LABELS: Record<string, string> = {
  summarize: "Summarize selection",
  ask: "Ask Swearch",
  relevance: "Check relevance",
  add: "Add to project",
  extract_claims: "Extract key claims",
};

interface Props {
  action: string;
  onClose: () => void;
  children: ReactNode;
  position: PanelPosition;
  onPositionChange: (position: PanelPosition) => void;
  hostElement: HTMLElement;
  showConnector?: boolean;
  connectorPosition?: PanelPosition["connectorPosition"];
}

export default function PanelContainer({
  action,
  onClose,
  children,
  position,
  onPositionChange,
  hostElement,
  showConnector = false,
  connectorPosition,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!isDragging) return;

    function onMouseMove(e: MouseEvent) {
      const newLeft = Math.max(0, e.clientX - dragOffset.current.x);
      const newTop = Math.max(0, e.clientY - dragOffset.current.y);

      hostElement.style.left = `${newLeft}px`;
      hostElement.style.top = `${newTop}px`;

      onPositionChange({
        ...position,
        top: newTop,
        left: newLeft,
        placement: "fixed-corner",
        connectorVisible: false,
        connectorPosition: undefined,
      });
    }

    function onMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging, hostElement, onPositionChange, position]);

  function onHeaderMouseDown(e: ReactMouseEvent) {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;

    e.preventDefault();
    const rect = hostElement.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
  }

  const label = ACTION_LABELS[action] ?? "Swearch";

  return (
    <div
      ref={containerRef}
      className="swearch-panel"
      role="dialog"
      aria-modal="true"
      aria-label={`Swearch — ${label}`}
    >
      {showConnector && connectorPosition && (
        <div
          className={`swearch-panel-connector swearch-panel-connector-${connectorPosition.type}`}
          style={{ left: `${connectorPosition.horizontalPercent}%` }}
          aria-hidden="true"
        />
      )}

      <div className="swearch-panel-header" onMouseDown={onHeaderMouseDown}>
        <div className="w-5 h-5 bg-accent rounded flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-bold">S</span>
        </div>
        <span className="text-sm font-semibold text-text-primary flex-1 truncate">
          {label}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-3 rounded-md transition-colors duration-150 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-accent/60"
          aria-label="Close panel"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      <div key={action} className="swearch-panel-content swearch-fade-in">
        {children}
      </div>
    </div>
  );
}
