import type { HighlightAnalysis } from "@swearch/shared/types/highlight-analysis";
import type { DocBlock } from "@swearch/shared/export/highlight-doc-blocks";

const GOOGLE_DOCS_API = "https://docs.googleapis.com/v1/documents";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DIVIDER_LINE = "────────────";

export type { HighlightAnalysis };
export type { DocBlock };

export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents",
] as const;

export class GoogleDriveError extends Error {
  constructor(
    message: string,
    readonly code?: string
  ) {
    super(message);
    this.name = "GoogleDriveError";
  }
}

function oauthSetupHint(): string {
  const extensionId = chrome.runtime.id;
  return (
    "Check Google Cloud Console: enable Drive API + Docs API, use a Chrome Extension " +
    `OAuth client (not Web) with extension ID ${extensionId}, and set VITE_GOOGLE_CLIENT_ID in .env.local.`
  );
}

function mapIdentityError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("bad client id") || lower.includes("invalid_client")) {
    return `Google OAuth client misconfigured. ${oauthSetupHint()}`;
  }
  if (lower.includes("access_denied") || lower.includes("user did not approve")) {
    return "Google access was denied. Allow Drive and Docs permissions when prompted.";
  }
  if (lower.includes("interaction required")) {
    return "Google sign-in required. Open Settings and tap Connect Google Drive.";
  }
  return message;
}

export async function clearGoogleAccessToken(token: string): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}

/** Prompts for Google Drive/Docs access via the extension OAuth client in manifest.json. */
export async function getGoogleAccessToken(options?: {
  interactive?: boolean;
}): Promise<string> {
  const interactive = options?.interactive ?? true;

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(
          new GoogleDriveError(
            mapIdentityError(chrome.runtime.lastError.message || "Google auth failed")
          )
        );
        return;
      }
      if (!token) {
        reject(new GoogleDriveError("Failed to get Google access token"));
        return;
      }
      resolve(token);
    });
  });
}

/** Verifies Drive/Docs access and caches a flag for the settings UI. */
export async function connectGoogleDrive(): Promise<void> {
  const token = await getGoogleAccessToken({ interactive: true });
  const response = await fetch(`${GOOGLE_DRIVE_API}?pageSize=1&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    await clearGoogleAccessToken(token);
    await throwGoogleApiError(response, "Google Drive connection failed");
  }
  await chrome.storage.local.set({
    googleDriveConnected: true,
    googleDriveConnectedAt: Date.now(),
  });
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  const { googleDriveConnected } = await chrome.storage.local.get(["googleDriveConnected"]);
  return !!googleDriveConnected;
}

async function throwGoogleApiError(response: Response, label: string): Promise<never> {
  let detail = response.statusText;
  let code: string | undefined;
  try {
    const body = await response.json();
    detail = body.error?.message || detail;
    code = body.error?.status || body.error?.code?.toString();
  } catch {
    // ignore parse errors
  }

  if (response.status === 401) {
    throw new GoogleDriveError(
      `${label}: session expired. Reconnect Google Drive in Settings.`,
      code
    );
  }
  if (response.status === 403) {
    throw new GoogleDriveError(
      `${label}: permission denied. Reconnect Google Drive and ensure you can edit the linked doc.`,
      code
    );
  }
  throw new GoogleDriveError(`${label}: ${detail}`, code);
}

async function googleFetch(
  url: string,
  init: RequestInit = {},
  retried = false
): Promise<Response> {
  const token = await getGoogleAccessToken({ interactive: !retried });
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if ((response.status === 401 || response.status === 403) && !retried) {
    await clearGoogleAccessToken(token);
    return googleFetch(url, init, true);
  }

  return response;
}

export interface GoogleDocSummary {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export async function listGoogleDocs(): Promise<GoogleDocSummary[]> {
  const response = await googleFetch(
    `${GOOGLE_DRIVE_API}?q=${encodeURIComponent("mimeType='application/vnd.google-apps.document'")}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=50`
  );

  if (!response.ok) {
    await throwGoogleApiError(response, "Could not list Google Docs");
  }

  const data = await response.json();
  const files: Array<{
    id: string;
    name: string;
    modifiedTime?: string;
    webViewLink?: string;
  }> = data.files || [];

  return files.map((file) => ({
    id: file.id,
    name: file.name,
    modifiedTime: file.modifiedTime || new Date(0).toISOString(),
    webViewLink: file.webViewLink,
  }));
}

export async function readGoogleDoc(docId: string): Promise<string> {
  const response = await googleFetch(`${GOOGLE_DOCS_API}/${docId}`);

  if (!response.ok) {
    await throwGoogleApiError(response, "Could not read Google Doc");
  }

  const doc = await response.json();

  const text =
    doc.body?.content
      ?.map((element: { paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }) =>
        element.paragraph?.elements
          ?.map((e) => e.textRun?.content || "")
          .join("") || ""
      )
      .join("\n") || "";

  return text;
}

interface TextRange {
  start: number;
  end: number;
}

type StyleSegment =
  | { kind: "heading"; level: 2 | 3; range: TextRange }
  | { kind: "quote"; range: TextRange }
  | { kind: "link"; url: string; urlRange: TextRange }
  | { kind: "bullets"; range: TextRange }
  | { kind: "spacing"; range: TextRange };

function flattenBlocks(blocks: DocBlock[]): { text: string; segments: StyleSegment[] } {
  let text = "\n";
  const segments: StyleSegment[] = [];

  for (const block of blocks) {
    const start = text.length;

    switch (block.type) {
      case "divider":
        text += `${DIVIDER_LINE}\n`;
        segments.push({ kind: "spacing", range: { start, end: text.length } });
        break;
      case "spacer":
        text += "\n";
        segments.push({ kind: "spacing", range: { start, end: text.length } });
        break;
      case "heading":
        text += `${block.text}\n`;
        segments.push({
          kind: "heading",
          level: block.level,
          range: { start, end: text.length },
        });
        break;
      case "paragraph":
        text += `${block.text}\n\n`;
        break;
      case "meta":
        text += `${block.text}\n`;
        break;
      case "quote": {
        const quoted = `"${block.text}"\n\n`;
        text += quoted;
        segments.push({
          kind: "quote",
          range: { start, end: start + `"${block.text}"\n`.length },
        });
        break;
      }
      case "link": {
        text += `${block.label}: `;
        const urlStart = text.length;
        text += block.url;
        const urlEnd = text.length;
        text += "\n";
        segments.push({
          kind: "link",
          url: block.url,
          urlRange: { start: urlStart, end: urlEnd },
        });
        break;
      }
      case "bullets": {
        const bulletStart = text.length;
        for (const item of block.items) {
          text += `${item}\n`;
        }
        segments.push({
          kind: "bullets",
          range: { start: bulletStart, end: text.length },
        });
        break;
      }
    }
  }

  text += "\n";
  return { text, segments };
}

function toAbsoluteRange(insertIndex: number, range: TextRange) {
  return {
    startIndex: insertIndex + range.start,
    endIndex: insertIndex + range.end,
  };
}

function buildStyleRequests(insertIndex: number, segments: StyleSegment[]): object[] {
  const requests: object[] = [];

  for (const segment of segments) {
    switch (segment.kind) {
      case "heading":
        requests.push({
          updateParagraphStyle: {
            range: toAbsoluteRange(insertIndex, segment.range),
            paragraphStyle: {
              namedStyleType: segment.level === 2 ? "HEADING_2" : "HEADING_3",
            },
            fields: "namedStyleType",
          },
        });
        break;
      case "quote":
        requests.push({
          updateParagraphStyle: {
            range: toAbsoluteRange(insertIndex, segment.range),
            paragraphStyle: {
              indentFirstLine: { magnitude: 36, unit: "PT" },
              indentStart: { magnitude: 36, unit: "PT" },
            },
            fields: "indentFirstLine,indentStart",
          },
        });
        requests.push({
          updateTextStyle: {
            range: toAbsoluteRange(insertIndex, segment.range),
            textStyle: { italic: true },
            fields: "italic",
          },
        });
        break;
      case "link":
        requests.push({
          updateTextStyle: {
            range: toAbsoluteRange(insertIndex, segment.urlRange),
            textStyle: { link: { url: segment.url } },
            fields: "link",
          },
        });
        break;
      case "bullets":
        requests.push({
          createParagraphBullets: {
            range: toAbsoluteRange(insertIndex, segment.range),
            bulletPreset: "BULLET_DISC_CIRCLE_SQUARE",
          },
        });
        break;
      case "spacing":
        requests.push({
          updateParagraphStyle: {
            range: toAbsoluteRange(insertIndex, segment.range),
            paragraphStyle: {
              spaceAbove: { magnitude: 12, unit: "PT" },
              spaceBelow: { magnitude: 12, unit: "PT" },
            },
            fields: "spaceAbove,spaceBelow",
          },
        });
        break;
    }
  }

  return requests;
}

export async function appendBlocksToGoogleDoc(docId: string, blocks: DocBlock[]): Promise<void> {
  const docResponse = await googleFetch(`${GOOGLE_DOCS_API}/${docId}`);

  if (!docResponse.ok) {
    await throwGoogleApiError(docResponse, "Could not open Google Doc for export");
  }

  const doc = await docResponse.json();
  const bodyContent = doc.body?.content || [];
  const lastElement = bodyContent[bodyContent.length - 1];
  const insertIndex = lastElement?.endIndex ? lastElement.endIndex - 1 : 1;

  const { text, segments } = flattenBlocks(blocks);
  const styleRequests = buildStyleRequests(insertIndex, segments);

  const batchResponse = await googleFetch(`${GOOGLE_DOCS_API}/${docId}:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: insertIndex },
            text,
          },
        },
        ...styleRequests,
      ],
    }),
  });

  if (!batchResponse.ok) {
    await throwGoogleApiError(batchResponse, "Could not append styled content to Google Doc");
  }
}

export async function resolveLinkedDocId(): Promise<string | null> {
  const stored = await new Promise<{ currentProjectDocId?: string }>((resolve) =>
    chrome.storage.local.get(["currentProjectDocId"], resolve)
  );

  if (stored.currentProjectDocId) return stored.currentProjectDocId;

  const { getActiveProjectId } = await import("./active-project");
  const projectId = await getActiveProjectId();
  if (!projectId) return null;

  const { fetchExportDocId } = await import("./project-google-docs");
  return fetchExportDocId(projectId);
}
