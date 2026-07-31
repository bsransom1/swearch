"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BTN_SECONDARY } from "@swearch/shared/theme";

export default function SettingsPage() {
  const router = useRouter();

  async function handleReconnect() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
        scopes: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  async function handleSignOut() {
    const confirmed = window.confirm("Sign out of Swearch?");
    if (!confirmed) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-[28px] font-bold text-text-primary mb-8">Settings</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-medium text-text-primary mb-3">Google Drive</h2>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">Status: connected ✓</span>
            <button type="button" onClick={() => void handleReconnect()} className={BTN_SECONDARY}>
              Reconnect
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-text-primary mb-3">Preferences</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">Language</span>
              <select
                disabled
                className="text-sm bg-surface-0 border border-border-subtle rounded-md px-3 py-1.5 text-text-primary"
              >
                <option>English</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">Theme</span>
              <select
                disabled
                className="text-sm bg-surface-0 border border-border-subtle rounded-md px-3 py-1.5 text-text-primary"
              >
                <option>Light</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-text-primary mb-3">Sign out</h2>
          <button type="button" onClick={() => void handleSignOut()} className={BTN_SECONDARY}>
            Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
