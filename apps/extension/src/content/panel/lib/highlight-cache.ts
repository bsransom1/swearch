import { bridge, type HighlightAnalysis } from "./bridge";

export type { CachedHighlight } from "../../../lib/highlight-cache";

/**
 * Panel-side cache lookup — delegates to the background service worker where
 * Supabase auth and DB access live.
 */
export async function getCachedAnalysis(
  selectionText: string,
  paperUrl: string
): Promise<HighlightAnalysis | null> {
  return bridge.checkCached({ selectionText, paperUrl });
}
