import { useState } from "react";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "../../lib/auth";
import { WEB_APP_ORIGINS } from "../../lib/auth-sync";
import { BTN_PRIMARY } from "../../lib/theme";

interface Props {
  onAuth: (user: any) => void;
}

type Mode = "login" | "signup";

const WEB_APP_LOGIN_URL = `${WEB_APP_ORIGINS[0]}/login`;

export default function AuthView({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let user;
      if (mode === "login") {
        user = await signInWithEmail(email, password);
      } else {
        user = await signUpWithEmail(email, password, fullName);
      }
      onAuth(user);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      onAuth(user);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  function openWebLogin() {
    chrome.tabs.create({ url: WEB_APP_LOGIN_URL });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-6">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">S</span>
        </div>
        <span className="text-text-primary font-semibold">Swearch</span>
      </div>

      <div>
        <h2 className="text-base font-semibold text-text-primary">
          {mode === "login" ? "Sign in" : "Create account"}
        </h2>
        <p className="text-xs text-text-tertiary mt-0.5">
          {mode === "login"
            ? "Access your research projects"
            : "Start condensing research"}
        </p>
      </div>

      <button
        onClick={handleGoogle}
        disabled={googleLoading || loading}
        className="w-full flex items-center justify-center gap-2 py-2 bg-surface-1 hover:bg-surface-2 disabled:opacity-50 border border-border-subtle rounded-lg text-sm text-text-primary transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {googleLoading ? "Opening Google..." : "Continue with Google"}
      </button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-xs text-text-tertiary">or</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-3 py-2 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
        />

        {error && (
          <p className="text-xs text-error bg-error-50 border border-error/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full ${BTN_PRIMARY}`}
        >
          {loading ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
        className="text-xs text-text-tertiary hover:text-text-secondary text-center transition-colors"
      >
        {mode === "login"
          ? "No account? Sign up"
          : "Already have an account? Sign in"}
      </button>

      <button
        onClick={openWebLogin}
        className="text-xs text-text-tertiary hover:text-text-secondary text-center transition-colors"
      >
        Prefer the web app? Sign in there
      </button>
    </div>
  );
}
