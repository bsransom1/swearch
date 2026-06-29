import { useEffect, useState } from "react";
import { restoreSession, getCurrentUser } from "../lib/auth";
import AuthView from "./views/AuthView";
import HomeView from "./views/HomeView";
import HighlightView from "./views/HighlightView";
import SettingsView from "./views/SettingsView";

type View = "auth" | "home" | "highlight" | "settings";

export default function App() {
  const [view, setView] = useState<View>("auth");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const restored = await restoreSession();
      if (restored) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        // Check for a pending highlight before defaulting to home
        chrome.storage.local.get(["pendingHighlight"], (result) => {
          setView(result.pendingHighlight ? "highlight" : "home");
        });
      } else {
        setView("auth");
      }
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="w-80 h-48 flex items-center justify-center bg-surface-0">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-80 min-h-96 max-h-[600px] overflow-y-auto bg-surface-0 text-text-primary font-sans">
      {view === "auth" && (
        <AuthView
          onAuth={(u) => {
            setUser(u);
            setView("home");
          }}
        />
      )}
      {view === "home" && (
        <HomeView
          user={user}
          onHighlight={() => setView("highlight")}
          onSettings={() => setView("settings")}
        />
      )}
      {view === "highlight" && (
        <HighlightView
          onBack={() => {
            chrome.action.setBadgeText({ text: "" });
            setView("home");
          }}
        />
      )}
      {view === "settings" && (
        <SettingsView onBack={() => setView("home")} />
      )}
    </div>
  );
}
