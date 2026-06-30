import { useEffect, useState } from "react";
import { restoreSession, getCurrentUser } from "../lib/auth";
import AuthView from "./views/AuthView";
import ChatView from "./views/ChatView";
import SettingsView from "./views/SettingsView";
import PopupShell from "./components/PopupShell";

type View = "auth" | "chat" | "settings";

export default function App() {
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

  if (loading) {
    return (
      <PopupShell>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </PopupShell>
    );
  }

  return (
    <PopupShell>
      {view === "auth" && <AuthView onAuth={() => setView("chat")} />}
      {view === "chat" && <ChatView onSettings={() => setView("settings")} />}
      {view === "settings" && <SettingsView onBack={() => setView("chat")} />}
    </PopupShell>
  );
}
