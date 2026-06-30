import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        // Surfaces — light mode (page → panel → card → nested)
        "surface-bg": "#f8f8f8",
        "surface-0": "#ffffff",
        "surface-1": "#f5f5f5",
        "surface-2": "#efefef",
        "surface-3": "#e5e5e5",
        "border-subtle": "#e5e5e5",
        "border-default": "#d0d0d0",

        // Text — light mode
        "text-primary": "#1a1a1a",
        "text-secondary": "#626262",
        "text-tertiary": "#999999",

        // Brand — unchanged across modes
        accent: "#6366f1",
        "accent-hover": "#4f46e5",
        "accent-muted": "#312e81",
        "accent-50": "#eef2ff",
        "accent-200": "#c7d2fe",

        amber: "#D97706",
        "amber-light": "#F59E0B",
        "amber-50": "#fffbeb",
        "amber-200": "#fde68a",

        success: "#10B981",
        "success-50": "#ecfdf5",
        "success-200": "#a7f3d0",
        error: "#DC2626",
        "error-50": "#fef2f2",
        warning: "#F97316",
      },
      boxShadow: {
        "tier-1": "0 8px 24px rgba(0, 0, 0, 0.1)",
        "tier-2": "0 2px 8px rgba(0, 0, 0, 0.06)",
        "tier-3": "0 4px 16px rgba(99, 102, 241, 0.12)",
        "tier-success": "0 4px 16px rgba(16, 185, 129, 0.12)",
        "btn-primary": "0 2px 6px rgba(99, 102, 241, 0.2)",
        "bubble-user": "0 2px 6px rgba(0, 0, 0, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
