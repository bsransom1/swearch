import { useEffect, useState } from "react";
import { restoreSession, getCurrentUser } from "../lib/auth";
import AuthView from "./views/AuthView";
import ChatView from "./views/ChatView";
import SettingsView from "./views/SettingsView";
import AppShell from "./components/AppShell";
import {
  ShellModeProvider,
  type ShellMode,
} from "./lib/shell-mode";

type View = "auth" | "chat" | "settings";

interface Props {
  shellMode: ShellMode;
}

export default function App({ shellMode }: Props) {
  const [view, setView] = useState<View>("auth");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const restored = await restoreSession();
      if (restored) {
        await getCurrentUser();
        setView("chat");
      } else {
        setView("auth");
      }
      setLoading(false);
    }
    init();

    async function recheckOnVisible() {
      if (document.visibilityState !== "visible") return;
      const restored = await restoreSession();
      if (restored) {
        setView((prev) => (prev === "auth" ? "chat" : prev));
      }
    }
    document.addEventListener("visibilitychange", recheckOnVisible);
    return () => document.removeEventListener("visibilitychange", recheckOnVisible);
  }, []);

  return (
    <ShellModeProvider mode={shellMode}>
      <AppShell mode={shellMode}>
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {view === "auth" && <AuthView onAuth={() => setView("chat")} />}
            {view === "chat" && <ChatView onSettings={() => setView("settings")} />}
            {view === "settings" && (
              <SettingsView
                onBack={() => setView("chat")}
                onSignedOut={() => setView("auth")}
              />
            )}
          </>
        )}
      </AppShell>
    </ShellModeProvider>
  );
}
