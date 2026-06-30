/** RPC-style wrapper for calling background service worker from panel code. */
export function callBackground<T>(type: string, payload?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error("No response from background"));
        return;
      }
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response.data as T);
    });
  });
}

export interface ActiveProject {
  id: string;
  name: string;
  google_doc_id: string | null;
  google_doc_title: string | null;
  description: string | null;
  context: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface HighlightAnalysis {
  summary: string;
  methodology: string | null;
  findings: string | null;
  limitations: string | null;
  relevance: string | null;
  sample_size: string | null;
  tags: string[];
}

export const bridge = {
  getActiveProject: () =>
    callBackground<ActiveProject | null>("SWEARCH_GET_ACTIVE_PROJECT"),

  getProjects: () =>
    callBackground<Project[]>("SWEARCH_GET_PROJECTS"),

  setActiveProject: (projectId: string) =>
    callBackground<Project>("SWEARCH_SET_ACTIVE_PROJECT", { projectId }),

  analyze: (params: {
    highlightText: string;
    paperTitle: string;
    paperUrl: string;
    projectContext: string;
    projectName: string;
  }) => callBackground<HighlightAnalysis>("SWEARCH_ANALYZE", params),

  extractClaims: (params: {
    highlightText: string;
    paperTitle: string;
    paperUrl: string;
    projectContext: string;
    projectName: string;
  }) => callBackground<{ claims: string[] }>("SWEARCH_EXTRACT_CLAIMS", params),

  ask: (params: {
    selectionText: string;
    question: string;
    paperTitle: string;
    paperUrl: string;
    projectContext: string;
    projectName: string;
  }) => callBackground<{ answer: string }>("SWEARCH_ASK", params),

  saveHighlight: (params: {
    selectedText: string;
    paperTitle: string;
    paperUrl: string;
    paperDoi: string | null;
    analysis: HighlightAnalysis;
    userNote?: string;
  }) => callBackground<{ id: string | null }>("SWEARCH_SAVE_HIGHLIGHT", params),

  checkCached: (params: {
    paperUrl: string;
    selectionText: string;
  }) => callBackground<HighlightAnalysis | null>("SWEARCH_CHECK_CACHED", params),
};
