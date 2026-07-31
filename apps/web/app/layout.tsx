import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AuthSyncProvider from "@/components/auth/auth-sync-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swearch — Research Condensation",
  description: "Highlight research papers, get AI summaries, export to Google Docs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} bg-surface-bg`}>
      <body className="bg-surface-bg text-text-primary antialiased min-h-screen">
        <AuthSyncProvider />
        {children}
      </body>
    </html>
  );
}
