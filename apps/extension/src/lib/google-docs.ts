import type { HighlightAnalysis } from "./claude";

const GOOGLE_DOCS_API = "https://docs.googleapis.com/v1/documents";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3/files";

export async function getGoogleAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!token) {
        reject(new Error("Failed to get Google access token"));
      } else {
        resolve(token);
      }
    });
  });
}

export async function listGoogleDocs(): Promise<Array<{ id: string; name: string }>> {
  const token = await getGoogleAccessToken();

  const response = await fetch(
    `${GOOGLE_DRIVE_API}?q=mimeType='application/vnd.google-apps.document'&fields=files(id,name)&orderBy=modifiedTime desc&pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) throw new Error(`Drive API error: ${response.statusText}`);

  const data = await response.json();
  return data.files || [];
}

// TODO: Cache Google Doc text and refresh only if doc was modified (use Drive API modifiedTime)
// Check Drive API files/{docId}?fields=modifiedTime against cached timestamp before re-fetching.
export async function readGoogleDoc(docId: string): Promise<string> {
  const token = await getGoogleAccessToken();

  const response = await fetch(`${GOOGLE_DOCS_API}/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`Docs API error: ${response.statusText}`);

  const doc = await response.json();

  // Extract plain text from document body structure
  const text =
    doc.body?.content
      ?.map((element: any) =>
        element.paragraph?.elements
          ?.map((e: any) => e.textRun?.content || "")
          .join("") || ""
      )
      .join("\n") || "";

  return text;
}

export async function appendToGoogleDoc(docId: string, content: string): Promise<void> {
  const token = await getGoogleAccessToken();

  // Fetch doc to determine current end index
  const docResponse = await fetch(`${GOOGLE_DOCS_API}/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!docResponse.ok) throw new Error(`Docs API error: ${docResponse.statusText}`);

  const doc = await docResponse.json();
  const bodyContent = doc.body?.content || [];
  const lastElement = bodyContent[bodyContent.length - 1];
  // endIndex is exclusive and includes the final newline — insert before it
  const insertIndex = lastElement?.endIndex ? lastElement.endIndex - 1 : 1;

  const batchResponse = await fetch(`${GOOGLE_DOCS_API}/${docId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            location: { index: insertIndex },
            text: `\n${content}\n`,
          },
        },
      ],
    }),
  });

  if (!batchResponse.ok) {
    throw new Error(`Docs batchUpdate error: ${batchResponse.statusText}`);
  }
}

export function formatHighlightForExport(params: {
  paperTitle: string;
  paperUrl: string;
  highlightText: string;
  analysis: HighlightAnalysis;
  timestamp: string;
}): string {
  const { paperTitle, paperUrl, highlightText, analysis, timestamp } = params;

  return [
    `───────────────────────────`,
    `📄 ${paperTitle}`,
    `🔗 ${paperUrl}`,
    `📅 ${timestamp}`,
    ``,
    `💬 Highlight:`,
    `"${highlightText}"`,
    ``,
    `📋 Summary:`,
    analysis.summary,
    analysis.findings ? `\n🔍 Key Finding:\n${analysis.findings}` : "",
    analysis.methodology ? `\n⚗️ Methodology:\n${analysis.methodology}` : "",
    analysis.limitations ? `\n⚠️ Limitations:\n${analysis.limitations}` : "",
    analysis.relevance ? `\n🎯 Relevance to Your Project:\n${analysis.relevance}` : "",
    analysis.tags.length > 0 ? `\n🏷️ Tags: ${analysis.tags.join(", ")}` : "",
    `───────────────────────────`,
  ]
    .filter(Boolean)
    .join("\n");
}
