export interface ExtensionStorage {
  authToken?: string;
  refreshToken?: string;
  user?: any;
  currentProjectId?: string;
  currentProjectName?: string;
  currentProjectDocId?: string;
  currentProjectContext?: string;
  currentProjectContextAt?: number;
  pendingHighlight?: {
    selectedText: string;
    paperTitle: string;
    paperUrl: string;
    paperDoi: string | null;
    timestamp: string;
  };
  recentPapers?: any[];
  lastSync?: number;
}

export const storage = {
  async get<K extends keyof ExtensionStorage>(
    keys: K[]
  ): Promise<Pick<ExtensionStorage, K>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys as string[], (result) => {
        resolve(result as Pick<ExtensionStorage, K>);
      });
    });
  },

  async set(values: Partial<ExtensionStorage>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(values, resolve);
    });
  },

  async remove(keys: (keyof ExtensionStorage)[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys as string[], resolve);
    });
  },

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  },
};
