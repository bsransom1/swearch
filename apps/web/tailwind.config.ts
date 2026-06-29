import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-0": "#0a0a0a",
        "surface-1": "#111111",
        "surface-2": "#1a1a1a",
        "surface-3": "#222222",
        "border-subtle": "#2a2a2a",
        "border-default": "#333333",
        "text-primary": "#f0f0f0",
        "text-secondary": "#a0a0a0",
        "text-tertiary": "#666666",
        accent: "#6366f1",
        "accent-hover": "#4f46e5",
        "accent-muted": "#312e81",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
