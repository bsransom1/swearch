import type { Config } from "tailwindcss";

/** Token values live in app/globals.css (`--sw-*`). Keep in sync with extension. */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/shared/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-bg": "var(--sw-surface-bg)",
        "surface-0": "var(--sw-surface-0)",
        "surface-1": "var(--sw-surface-1)",
        "surface-2": "var(--sw-surface-2)",
        "surface-3": "var(--sw-surface-3)",
        "border-subtle": "var(--sw-border-subtle)",
        "border-default": "var(--sw-border-default)",

        "text-primary": "var(--sw-text-primary)",
        "text-secondary": "var(--sw-text-secondary)",
        "text-tertiary": "var(--sw-text-tertiary)",

        accent: "var(--sw-accent)",
        "accent-hover": "var(--sw-accent-hover)",
        "accent-muted": "var(--sw-accent-muted)",
        "accent-50": "var(--sw-accent-50)",
        "accent-200": "var(--sw-accent-200)",

        amber: "var(--sw-amber)",
        "amber-50": "var(--sw-amber-50)",
        "amber-200": "var(--sw-amber-200)",

        success: "var(--sw-success)",
        "success-50": "var(--sw-success-50)",
        "success-200": "var(--sw-success-200)",
        error: "var(--sw-error)",
        "error-50": "var(--sw-error-50)",
        warning: "var(--sw-warning)",
      },
      boxShadow: {
        "tier-1": "0 8px 24px rgba(0, 0, 0, 0.1)",
        "tier-2": "0 2px 8px rgba(0, 0, 0, 0.06)",
        "tier-3": "0 4px 16px rgba(99, 102, 241, 0.12)",
        "tier-success": "0 4px 16px rgba(16, 185, 129, 0.12)",
        "btn-primary": "0 2px 6px rgba(99, 102, 241, 0.2)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
