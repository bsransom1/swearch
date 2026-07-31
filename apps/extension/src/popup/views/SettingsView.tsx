import { useEffect, useState } from "react";
import { signOut } from "../../lib/auth";
import {
  connectGoogleDrive,
  isGoogleDriveConnected,
} from "../../lib/google-docs";
import GoogleDriveIcon from "../components/GoogleDriveIcon";
import { BTN_SECONDARY, BTN_DESTRUCTIVE } from "../../lib/theme";
import { useShellMode } from "../lib/shell-mode";
import { clearAllChatHistory } from "../../lib/chat-session";

interface Props {
  onBack: () => void;
  onSignedOut?: () => void;
}

export default function SettingsView({ onBack, onSignedOut }: Props) {
  const [driveConnected, setDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [clearingChat, setClearingChat] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    isGoogleDriveConnected()
      .then(setDriveConnected)
      .catch(() => setDriveConnected(false));
  }, []);

  async function handleConnectDrive() {
    setConnectingDrive(true);
    setDriveError(null);
    try {
      await connectGoogleDrive();
      setDriveConnected(true);
    } catch (e: unknown) {
      setDriveError(e instanceof Error ? e.message : "Failed to connect Google Drive");
      setDriveConnected(false);
    } finally {
      setConnectingDrive(false);
    }
  }

  async function handleClearChat() {
    setClearingChat(true);
    try {
      await clearAllChatHistory();
    } finally {
      setClearingChat(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      onSignedOut?.();
    } catch (e: unknown) {
      setDriveError(e instanceof Error ? e.message : "Sign out failed");
    } finally {
      setSigningOut(false);
    }
  }

  const isSidebar = useShellMode() === "sidebar";

  return (
    <div
      className={`flex h-full min-h-0 flex-col gap-5 overflow-y-auto ${
        isSidebar ? "p-5" : "p-4"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
        >
          ← Back
        </button>
        <span className="text-sm font-medium text-text-primary">Settings</span>
      </div>

      <div className="flex items-center gap-2.5 bg-surface-1 border border-border-subtle rounded-lg px-3 py-2">
        <GoogleDriveIcon className="w-4 h-4 flex-shrink-0" />
        <p className="flex-1 min-w-0 text-xs text-text-secondary">
          Google Drive:{" "}
          <span className={driveConnected ? "text-green-500" : "text-text-tertiary"}>
            {driveConnected ? "Connected" : "Not connected"}
          </span>
        </p>
        <button
          onClick={handleConnectDrive}
          disabled={connectingDrive}
          className="flex-shrink-0 px-2.5 py-1 bg-surface-2 hover:bg-surface-0 border border-border-subtle rounded-md text-[11px] text-text-secondary disabled:opacity-50 transition-colors"
        >
          {connectingDrive ? "Connecting…" : driveConnected ? "Reconnect" : "Connect"}
        </button>
      </div>

      {driveError && (
        <p className="text-xs text-error bg-error-50 border border-error/30 rounded-lg px-3 py-2">
          {driveError}
        </p>
      )}

      <p className="text-[11px] text-text-tertiary leading-relaxed">
        Project docs, papers, and highlights are managed in the <strong>Project</strong> tab.
        Switch projects using the dropdown in the header.
      </p>

      <div className="space-y-2 pt-2 border-t border-border-subtle">
        <button
          type="button"
          onClick={handleClearChat}
          disabled={clearingChat}
          className={`w-full py-2 text-xs ${BTN_SECONDARY}`}
        >
          {clearingChat ? "Clearing…" : "Clear chat history"}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className={`w-full py-2 text-xs ${BTN_DESTRUCTIVE}`}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
