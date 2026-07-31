import { useCallback, useEffect, useState } from "react";
import PanelContainer from "./PanelContainer";
import SummarizeView from "./views/SummarizeView";
import AskView from "./views/AskView";
import RelevanceView from "./views/RelevanceView";
import AddToProjectView from "./views/AddToProjectView";
import ExtractClaimsView from "./views/ExtractClaimsView";
import { bridge, type ActiveProject } from "./lib/bridge";
import { registerHandler, registerCloseHandler, type ActionPayload } from "./lib/action-bus";
import {
  applyPanelPosition,
  calculatePanelPosition,
  getSelectionRect,
  type PanelPosition,
} from "./lib/position-calculator";

export type { ActionPayload };

interface Props {
  hostElement: HTMLElement;
}

function positionForCurrentSelection(): PanelPosition {
  return calculatePanelPosition(getSelectionRect());
}

export default function PanelRoot({ hostElement }: Props) {
  const [payload, setPayload] = useState<ActionPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const [project, setProject] = useState<ActiveProject | null | undefined>(undefined);
  const [position, setPosition] = useState<PanelPosition>(() => positionForCurrentSelection());

  useEffect(() => {
    bridge
      .getActiveProject()
      .then(setProject)
      .catch(() => setProject(null));
  }, []);

  const openWithPosition = useCallback(
    (detail: ActionPayload) => {
      const nextPosition = positionForCurrentSelection();
      applyPanelPosition(hostElement, nextPosition);
      setPosition(nextPosition);
      setPayload(detail);
      setVisible(true);
    },
    [hostElement]
  );

  useEffect(() => {
    registerHandler(openWithPosition);
  }, [openWithPosition]);

  const close = useCallback(() => {
    setVisible(false);
    setPayload(null);
  }, []);

  useEffect(() => {
    registerCloseHandler(close);
    return () => registerCloseHandler(null);
  }, [close]);

  const switchAction = useCallback(
    (nextAction: ActionPayload["action"]) => {
      setPayload((current) =>
        current ? { ...current, action: nextAction, timestamp: new Date().toISOString() } : null
      );
    },
    []
  );

  const handlePositionChange = useCallback((next: PanelPosition) => {
    setPosition(next);
  }, []);

  if (!visible || !payload) return null;

  const resolvedProject = project ?? null;

  function renderView() {
    if (!payload) return null;

    switch (payload.action) {
      case "summarize":
        return (
          <SummarizeView key={payload.timestamp} payload={payload} project={resolvedProject} />
        );
      case "ask":
        return <AskView key={payload.timestamp} payload={payload} project={resolvedProject} />;
      case "relevance":
        return (
          <RelevanceView
            key={payload.timestamp}
            payload={payload}
            project={resolvedProject}
            onProjectSet={setProject}
          />
        );
      case "add":
        return (
          <AddToProjectView
            key={payload.timestamp}
            payload={payload}
            project={resolvedProject}
            onProjectSet={setProject}
            onSaved={close}
          />
        );
      case "extract_claims":
        return (
          <ExtractClaimsView
            key={payload.timestamp}
            payload={payload}
            project={resolvedProject}
            onSwitchAction={switchAction}
          />
        );
      default:
        return (
          <div className="p-4 text-xs text-text-tertiary">
            Unknown action: {payload.action}
          </div>
        );
    }
  }

  return (
    <PanelContainer
      action={payload.action}
      onClose={close}
      position={position}
      onPositionChange={handlePositionChange}
      hostElement={hostElement}
      showConnector={position.connectorVisible}
      connectorPosition={position.connectorPosition}
    >
      {renderView()}
    </PanelContainer>
  );
}
