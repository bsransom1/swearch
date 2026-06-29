import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Swearch — Research Condensation",
  description: "Highlight research papers, get AI summaries, export to Google Docs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
