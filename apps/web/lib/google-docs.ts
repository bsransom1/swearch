import type { DocBlock, HighlightExportParams } from "@swearch/shared/export/highlight-doc-blocks";
import { toHighlightExportInput } from "@swearch/shared/export/highlight-doc-blocks";
import {
  buildGoogleDocsAppendRequests,
  type HighlightExportInput,
} from "@swearch/shared/export/google-docs-batch";

const GOOGLE_DOCS_API = "https://docs.googleapis.com/v1/documents";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3/files";

export type { HighlightExportInput, DocBlock };

export interface GoogleDocSummary {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

async function googleFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function listGoogleDocs(token: string): Promise<GoogleDocSummary[]> {
  const response = await googleFetch(
    token,
    `${GOOGLE_DRIVE_API}?q=${encodeURIComponent("mimeType='application/vnd.google-apps.document'")}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=50`
  );

  if (!response.ok) {
    throw new Error("Could not list Google Docs. Reconnect Google in Settings.");
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

export async function readGoogleDoc(token: string, docId: string): Promise<string> {
  const response = await googleFetch(token, `${GOOGLE_DOCS_API}/${docId}`);

  if (!response.ok) {
    throw new Error("Could not read Google Doc.");
  }

  const doc = await response.json();
  return (
    doc.body?.content
      ?.map((element: { paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }) =>
        element.paragraph?.elements?.map((e) => e.textRun?.content || "").join("") || ""
      )
      .join("\n") || ""
  );
}

export async function getGoogleAccessToken(
  getSession: () => Promise<{ provider_token?: string | null } | null>
): Promise<string> {
  const session = await getSession();
  const token = session?.provider_token;
  if (!token) {
    throw new Error("Google access not available. Sign in with Google or reconnect in Settings.");
  }
  return token;
}

async function getDocInsertIndex(token: string, docId: string): Promise<number> {
  const docResponse = await googleFetch(token, `${GOOGLE_DOCS_API}/${docId}`);
  if (!docResponse.ok) {
    throw new Error("Could not open Google Doc for export.");
  }
  const doc = await docResponse.json();
  const bodyContent = doc.body?.content || [];
  const lastElement = bodyContent[bodyContent.length - 1];
  return lastElement?.endIndex ? lastElement.endIndex - 1 : 1;
}

export async function appendHighlightExportToGoogleDoc(
  token: string,
  docId: string,
  input: HighlightExportInput
): Promise<void> {
  const insertIndex = await getDocInsertIndex(token, docId);
  const requests = buildGoogleDocsAppendRequests(insertIndex, input);

  const batchResponse = await googleFetch(token, `${GOOGLE_DOCS_API}/${docId}:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });

  if (!batchResponse.ok) {
    throw new Error("Could not append content to Google Doc.");
  }
}

/** @deprecated Use appendHighlightExportToGoogleDoc with HighlightExportInput. */
export async function appendBlocksToGoogleDoc(
  token: string,
  docId: string,
  blocks: DocBlock[]
): Promise<void> {
  void token;
  void docId;
  void blocks;
  throw new Error("appendBlocksToGoogleDoc is deprecated — use appendHighlightExportToGoogleDoc");
}

export function highlightParamsToExportInput(params: HighlightExportParams): HighlightExportInput {
  return toHighlightExportInput(params);
}
