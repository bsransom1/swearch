import type { Metadata } from "next";
import "./globals.css";
import AuthSyncProvider from "@/components/auth/auth-sync-provider";

export const metadata: Metadata = {
  title: "Swearch — Research Condensation",
  description: "Highlight research papers, get AI summaries, export to Google Docs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthSyncProvider />
        {children}
      </body>
    </html>
  );
}
