const GOOGLE_DOCS_API = "https://docs.googleapis.com/v1/documents";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3/files";

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
