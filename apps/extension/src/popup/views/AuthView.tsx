import { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "../../lib/auth";

interface Props {
  onAuth: (user: any) => void;
}

type Mode = "login" | "signup";

export default function AuthView({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="flex flex-col p-6 gap-5">
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
          <p className="text-xs text-red-400 bg-red-950 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
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
    </div>
  );
}
