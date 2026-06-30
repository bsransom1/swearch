"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AuthSyncMessageType,
  isAuthSyncMessage,
  makeSessionMessage,
  makeSignOutMessage,
  type AuthSyncMessage,
} from "@swearch/shared/constants/auth-sync";

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID;

// chrome.runtime is injected into the page only when the Swearch extension is
// installed and this origin is listed in its externally_connectable matches.
// Typed loosely because the web app doesn't depend on @types/chrome.
function getExtensionRuntime():
  | { sendMessage: (...args: unknown[]) => void; lastError?: unknown }
  | undefined {
  const chrome = (globalThis as { chrome?: { runtime?: unknown } }).chrome;
  const runtime = chrome?.runtime as
    | { sendMessage?: (...args: unknown[]) => void; lastError?: unknown }
    | undefined;
  return runtime?.sendMessage ? (runtime as never) : undefined;
}

function sendToExtension(message: AuthSyncMessage): void {
  const runtime = getExtensionRuntime();
  if (!runtime || !EXTENSION_ID) return;
  try {
    runtime.sendMessage(EXTENSION_ID, message, () => {
      // Read lastError so Chrome doesn't log an unchecked-error warning when the
      // extension isn't reachable.
      void runtime.lastError;
    });
  } catch {
    // Extension not installed or not reachable — sync is best-effort.
  }
}

// Bridges the web app's Supabase session with the extension. Renders nothing.
//
//   web -> extension : chrome.runtime.sendMessage(EXTENSION_ID) directly
//   extension -> web : the extension's content script postMessages into this
//                      page; we listen for those window messages here.
export default function AuthSyncProvider() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Push the current session to the extension on load.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        sendToExtension(
          makeSessionMessage({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
        );
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        sendToExtension(
          makeSessionMessage({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          })
        );
      }
      if (event === "SIGNED_OUT") {
        sendToExtension(makeSignOutMessage());
      }
    });

    // Receive sessions/sign-outs pushed from the extension content script.
    async function handleWindowMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }
      const data = event.data;
      if (!isAuthSyncMessage(data)) return;

      if (data.type === AuthSyncMessageType.Session) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        // Guard against echo loops: ignore a session we already hold.
        if (session?.access_token === data.access_token) return;
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        router.refresh();
      }

      if (data.type === AuthSyncMessageType.SignOut) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.auth.signOut();
        router.refresh();
      }
    }

    window.addEventListener("message", handleWindowMessage);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [router]);

  return null;
}
