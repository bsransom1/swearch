"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setGoogleConnected(!!data.google_connected_at);
      }
    }
    load();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleGoogleConnect() {
    const supabase = createClient();
    // Supabase OAuth with Google — requesting Drive + Docs scopes
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: [
          "https://www.googleapis.com/auth/drive.readonly",
          "https://www.googleapis.com/auth/documents",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  async function handleGoogleDisconnect() {
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_connected_at: null,
      })
      .eq("id", profile.id);
    setGoogleConnected(false);
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure? This permanently deletes your account and all research data. This cannot be undone."
    );
    if (!confirmed) return;

    // TODO: Implement account deletion — requires a Supabase Edge Function to call
    // supabase.auth.admin.deleteUser(userId) since clients can't delete their own auth record.
    alert("Account deletion is not yet implemented. Contact support.");
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-text-primary mb-8">Settings</h1>

      {/* Account section */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
          Account
        </h2>
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-5">
          {profile?.avatar_url && (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full mb-4"
            />
          )}
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-text-tertiary block mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs text-text-tertiary block mb-1.5">Email</label>
              <input
                type="email"
                value={profile?.email || ""}
                disabled
                className="w-full px-3 py-2.5 bg-surface-0 border border-border-subtle rounded-lg text-sm text-text-tertiary cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="self-start px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
            </button>
          </form>
        </div>
      </section>

      {/* Google Drive section */}
      <section className="mb-8">
        <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-4">
          Google Drive
        </h2>
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Google Docs connection</p>
              <p className="text-xs text-text-tertiary mt-1">
                {googleConnected
                  ? "Connected — highlights can be exported to Google Docs."
                  : "Connect Google Drive to export highlights directly to your research document."}
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              {googleConnected ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-500">✓ Connected</span>
                  <button
                    onClick={handleGoogleDisconnect}
                    className="text-xs text-text-tertiary hover:text-red-400 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleConnect}
                  className="flex items-center gap-2 px-3 py-2 bg-surface-0 border border-border-default hover:border-border-default rounded-lg text-sm text-text-primary transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Connect Google
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-xs font-medium text-red-500 uppercase tracking-wider mb-4">
          Danger Zone
        </h2>
        <div className="bg-surface-1 border border-red-900 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Delete account</p>
              <p className="text-xs text-text-tertiary mt-1">
                Permanently delete your account and all associated research data.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="flex-shrink-0 ml-4 px-3 py-2 border border-red-800 hover:bg-red-950 text-red-400 rounded-lg text-sm transition-colors"
            >
              Delete account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
