import { describe, expect, it } from "vitest";
import {
  AUTH_SYNC_SOURCE,
  AuthSyncMessageType,
  isAuthSyncMessage,
  makeRequestSessionMessage,
  makeSessionMessage,
  makeSignOutMessage,
  originToMatchPattern,
  parseWebAppOrigins,
} from "./auth-sync";

describe("auth-sync protocol", () => {
  it("builds a session message with the shared source marker", () => {
    const message = makeSessionMessage({
      access_token: "access-123",
      refresh_token: "refresh-456",
    });
    expect(message).toEqual({
      source: AUTH_SYNC_SOURCE,
      type: AuthSyncMessageType.Session,
      access_token: "access-123",
      refresh_token: "refresh-456",
    });
    expect(isAuthSyncMessage(message)).toBe(true);
  });

  it("builds sign-out and request-session messages", () => {
    expect(makeSignOutMessage()).toEqual({
      source: AUTH_SYNC_SOURCE,
      type: AuthSyncMessageType.SignOut,
    });
    expect(makeRequestSessionMessage()).toEqual({
      source: AUTH_SYNC_SOURCE,
      type: AuthSyncMessageType.RequestSession,
    });
  });

  it("rejects messages with the wrong source or unknown type", () => {
    expect(
      isAuthSyncMessage({
        source: "other",
        type: AuthSyncMessageType.Session,
        access_token: "a",
        refresh_token: "b",
      })
    ).toBe(false);
    expect(
      isAuthSyncMessage({
        source: AUTH_SYNC_SOURCE,
        type: "NOT_A_REAL_TYPE",
      })
    ).toBe(false);
    expect(isAuthSyncMessage(null)).toBe(false);
    expect(isAuthSyncMessage("string")).toBe(false);
  });

  it("parses web-app origins with trimming and deduplication", () => {
    expect(parseWebAppOrigins("http://localhost:3000, https://swearch.app/")).toEqual([
      "http://localhost:3000",
      "https://swearch.app",
    ]);
    expect(parseWebAppOrigins("")).toEqual(["http://localhost:3000"]);
    expect(parseWebAppOrigins(undefined)).toEqual(["http://localhost:3000"]);
  });

  it("converts origins to chrome match patterns", () => {
    expect(originToMatchPattern("http://localhost:3000")).toBe(
      "http://localhost:3000/*"
    );
    expect(originToMatchPattern("https://swearch.app/")).toBe(
      "https://swearch.app/*"
    );
  });
});
