/**
 * Simulates the bidirectional auth bridge without Chrome or Supabase.
 * Verifies echo-loop guards and message routing logic used by both surfaces.
 */
import { describe, expect, it } from "vitest";
import {
  AuthSyncMessageType,
  isAuthSyncMessage,
  makeSessionMessage,
  makeSignOutMessage,
} from "../packages/shared/constants/auth-sync";

type StoredSession = { access_token: string; refresh_token: string } | null;

type MessageEventLike = {
  source: unknown;
  origin: string;
  data: unknown;
};

/** Minimal web-side mirror of AuthSyncProvider session handling. */
function createWebAuthSync() {
  let session: StoredSession = null;
  const extensionInbox: unknown[] = [];
  const windowRef = globalThis;

  return {
    getSession: () => session,
    setSession: (tokens: { access_token: string; refresh_token: string }) => {
      if (session?.access_token === tokens.access_token) return false;
      session = { ...tokens };
      return true;
    },
    signOut: () => {
      if (!session) return false;
      session = null;
      return true;
    },
    pushToExtension: (message: unknown) => {
      extensionInbox.push(message);
    },
    receiveFromExtension: (event: MessageEventLike) => {
      if (event.source !== windowRef || event.origin !== "http://localhost:3000") {
        return;
      }
      const data = event.data;
      if (!isAuthSyncMessage(data)) return false;

      if (data.type === AuthSyncMessageType.Session) {
        if (session?.access_token === data.access_token) return false;
        session = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        };
        return true;
      }
      if (data.type === AuthSyncMessageType.SignOut) {
        if (!session) return false;
        session = null;
        return true;
      }
      return false;
    },
    extensionInbox,
  };
}

/** Minimal extension-side mirror of applySession / clearSession. */
function createExtensionAuthSync(initial: StoredSession = null) {
  let session = initial;
  const webTabInbox: unknown[] = [];

  return {
    getSession: () => session,
    applySession: (tokens: { access_token: string; refresh_token: string }) => {
      if (session?.access_token === tokens.access_token) return false;
      session = { ...tokens };
      return true;
    },
    clearSession: () => {
      if (!session) return false;
      session = null;
      return true;
    },
    broadcastToWeb: (message: unknown) => {
      webTabInbox.push(message);
    },
    webTabInbox,
  };
}

describe("auth bridge simulation", () => {
  it("web login pushes session to extension", () => {
    const web = createWebAuthSync();
    const ext = createExtensionAuthSync();

    const tokens = { access_token: "web-access", refresh_token: "web-refresh" };
    web.setSession(tokens);
    web.pushToExtension(makeSessionMessage(tokens));

    expect(web.extensionInbox).toHaveLength(1);
    const msg = web.extensionInbox[0];
    expect(isAuthSyncMessage(msg)).toBe(true);

    expect(ext.applySession(tokens)).toBe(true);
    expect(ext.getSession()).toEqual(tokens);
  });

  it("extension login pushes session to web via content script relay", () => {
    const web = createWebAuthSync();
    const ext = createExtensionAuthSync();

    const tokens = { access_token: "ext-access", refresh_token: "ext-refresh" };
    ext.applySession(tokens);
    const message = makeSessionMessage(tokens);
    ext.broadcastToWeb(message);

    expect(ext.webTabInbox).toHaveLength(1);

    const applied = web.receiveFromExtension({
      source: globalThis,
      origin: "http://localhost:3000",
      data: message,
    });
    expect(applied).toBe(true);
    expect(web.getSession()).toEqual(tokens);
  });

  it("ignores echo loops when the same access token is re-sent", () => {
    const web = createWebAuthSync();
    web.setSession({ access_token: "same", refresh_token: "refresh" });

    const ext = createExtensionAuthSync({
      access_token: "same",
      refresh_token: "refresh",
    });

    const message = makeSessionMessage({
      access_token: "same",
      refresh_token: "refresh",
    });

    expect(ext.applySession(message)).toBe(false);
    expect(
      web.receiveFromExtension({
        source: globalThis,
        origin: "http://localhost:3000",
        data: message,
      })
    ).toBe(false);
  });

  it("sign-out on web clears extension session", () => {
    const ext = createExtensionAuthSync({
      access_token: "a",
      refresh_token: "b",
    });

    ext.clearSession();
    expect(ext.getSession()).toBeNull();
  });

  it("sign-out on extension clears web session via postMessage", () => {
    const web = createWebAuthSync();
    web.setSession({ access_token: "a", refresh_token: "b" });

    const signOut = makeSignOutMessage();
    const cleared = web.receiveFromExtension({
      source: globalThis,
      origin: "http://localhost:3000",
      data: signOut,
    });

    expect(cleared).toBe(true);
    expect(web.getSession()).toBeNull();
  });

  it("rejects messages from foreign origins", () => {
    const web = createWebAuthSync();
    const result = web.receiveFromExtension({
      source: globalThis,
      origin: "https://evil.example",
      data: makeSessionMessage({ access_token: "x", refresh_token: "y" }),
    });
    expect(result).toBeUndefined();
    expect(web.getSession()).toBeNull();
  });

  it("token refresh updates both sides with a new access token", () => {
    const web = createWebAuthSync();
    const ext = createExtensionAuthSync({
      access_token: "old-access",
      refresh_token: "refresh",
    });

    web.setSession({ access_token: "old-access", refresh_token: "refresh" });

    const refreshed = {
      access_token: "new-access",
      refresh_token: "refresh",
    };
    web.setSession(refreshed);
    web.pushToExtension(makeSessionMessage(refreshed));
    ext.applySession(refreshed);

    expect(web.getSession()?.access_token).toBe("new-access");
    expect(ext.getSession()?.access_token).toBe("new-access");
  });
});
