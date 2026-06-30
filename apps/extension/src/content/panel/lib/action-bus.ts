export interface ActionPayload {
  action: string;
  selectionText: string;
  paperTitle: string;
  paperUrl: string;
  paperDoi: string | null;
  timestamp: string;
  truncated?: boolean;
}

/** Persisted on window so state survives panel script re-injection. */
interface ActionBus {
  handler: ((detail: ActionPayload) => void) | null;
  queue: ActionPayload[];
}

const BUS_KEY = "__swearchActionBus";

function getBus(): ActionBus {
  const w = window as typeof window & { [BUS_KEY]?: ActionBus };
  if (!w[BUS_KEY]) {
    w[BUS_KEY] = { handler: null, queue: [] };
  }
  return w[BUS_KEY];
}

export function registerHandler(handler: (detail: ActionPayload) => void): void {
  const bus = getBus();
  bus.handler = handler;
  while (bus.queue.length > 0) {
    const detail = bus.queue.shift()!;
    handler(detail);
  }
}

export function dispatchAction(detail: ActionPayload): void {
  const bus = getBus();
  if (bus.handler) {
    bus.handler(detail);
  } else {
    bus.queue.push(detail);
  }
}

/** Called once from panel-injector after the global opener is registered. */
export function drainExternalPending(): void {
  const w = window as typeof window & { __swearchPendingActions?: ActionPayload[] };
  const pending = w.__swearchPendingActions;
  if (!Array.isArray(pending) || pending.length === 0) return;
  w.__swearchPendingActions = [];
  for (const detail of pending) {
    dispatchAction(detail);
  }
}
