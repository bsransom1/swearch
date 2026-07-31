import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Swearch",
  description: "How Swearch collects, uses, and protects your research data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/login"
          className="text-sm text-accent hover:underline mb-8 inline-block"
        >
          ← Back to Swearch
        </Link>

        <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-text-tertiary mb-10">Last updated: July 31, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Data collected</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-primary">Account data:</strong> email address and
                name from Supabase authentication.
              </li>
              <li>
                <strong className="text-text-primary">Highlight text:</strong> text you select on
                research pages when using Swearch.
              </li>
              <li>
                <strong className="text-text-primary">Page metadata:</strong> URL, title, and where
                available the abstract and DOI of the page you invoke Swearch on.
              </li>
              <li>
                <strong className="text-text-primary">Project data:</strong> project names,
                descriptions, linked Google Doc IDs and titles, and cached text or summaries of docs
                you explicitly link as project context.
              </li>
              <li>
                <strong className="text-text-primary">AI analysis results:</strong> summaries,
                methodology and findings extractions, relevance notes, and tags generated from your
                highlights.
              </li>
              <li>
                <strong className="text-text-primary">Chat messages:</strong> questions you ask
                Swearch and the replies you receive, kept per project for the current browser
                session.
              </li>
              <li>
                <strong className="text-text-primary">Saved paper recommendations:</strong> titles,
                URLs, authors, years, and abstracts of related papers you choose to save to a
                project.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. How data is used</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Highlight text, chat messages, page metadata, and project context (linked doc
                excerpts or summaries, recent highlights, saved papers) are sent to Anthropic Claude
                through Supabase Edge Functions to generate summaries, answers, and relevance
                analysis. The Anthropic API key stays on the server and is never shipped to the
                extension or web app.
              </li>
              <li>
                Google access is used only to list your Google Docs so you can pick which ones to
                link, to read the docs you explicitly link as project context, and to append
                exports you explicitly trigger.
              </li>
              <li>
                Account, project, paper, and highlight data are stored in Supabase (PostgreSQL),
                scoped to your account with Row Level Security so only you can read or write it.
              </li>
              <li>
                Data is never sold, shared with advertisers, or used for advertising or model
                training by Swearch.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. Data storage</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-primary">Cloud:</strong> account, project, paper,
                highlight, and saved-recommendation data live in Supabase (PostgreSQL).
              </li>
              <li>
                <strong className="text-text-primary">Device (persistent):</strong> your Swearch
                sign-in tokens and active-project details are cached in{" "}
                <code className="text-xs bg-surface-1 px-1 py-0.5 rounded">chrome.storage.local</code>{" "}
                and cleared when you sign out.
              </li>
              <li>
                <strong className="text-text-primary">Device (session only):</strong> chat history
                per project and the IDs of highlights captured this session are kept in{" "}
                <code className="text-xs bg-surface-1 px-1 py-0.5 rounded">chrome.storage.session</code>{" "}
                and cleared when the browser closes. Chat history can also be cleared on demand from
                the extension.
              </li>
              <li>
                <strong className="text-text-primary">Google tokens:</strong> in the extension,
                Google Drive and Docs access tokens are issued and cached by Chrome itself through{" "}
                <code className="text-xs bg-surface-1 px-1 py-0.5 rounded">chrome.identity</code>{" "}
                and can be revoked from your Google Account permissions page. In the web app, the
                Google access token is held only in your Supabase session. Swearch does not store
                long-lived Google refresh tokens in its database.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. Data sharing</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-text-primary">Anthropic:</strong> receives highlight text,
                chat messages, page metadata, and project context for AI analysis.
              </li>
              <li>
                <strong className="text-text-primary">OpenAlex:</strong> receives a search query
                derived from the page title or abstract when you use the related-papers feature.
              </li>
              <li>
                <strong className="text-text-primary">Google (Drive and Docs APIs):</strong>{" "}
                receives OAuth-scoped requests to list your docs, read docs you link as context, and
                append exports you trigger.
              </li>
              <li>
                <strong className="text-text-primary">Supabase:</strong> hosts authentication, the
                database, and the Edge Functions described above.
              </li>
              <li>No other third-party sharing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              5. Retention and deletion
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Cloud data is retained for as long as your account exists. Deleting a project
                removes its papers, highlights, linked-doc records, and saved recommendations.
              </li>
              <li>
                Session data (chat history, session highlight IDs) is discarded when your browser
                closes.
              </li>
              <li>
                <strong className="text-text-primary">Account deletion:</strong> email{" "}
                <a href="mailto:privacy@swearch.app" className="text-accent hover:underline">
                  privacy@swearch.app
                </a>{" "}
                from the address on your account with the subject line{" "}
                <em>Delete my account</em>. We confirm receipt within 5 business days and delete
                your authentication record and all associated project, paper, highlight, linked-doc,
                and recommendation rows within 30 days. Content you already exported into your own
                Google Docs stays in your Drive and is yours to delete.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Your control</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Sign out at any time to clear cached sign-in tokens on your device.</li>
              <li>Clear chat history on demand from extension Settings.</li>
              <li>Unlink a Google Doc from a project at any time.</li>
              <li>
                Revoke Swearch&apos;s Google Drive and Docs access from your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent hover:underline"
                >
                  Google Account permissions
                </a>{" "}
                page.
              </li>
              <li>Delete individual highlights and projects from the web app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">7. Extension behavior</h2>
            <p>
              Swearch activates only on explicit user action: right-clicking selected text to use a
              Swearch context-menu action, or clicking the Swearch toolbar icon to open the sidebar.
              It does not inject UI on page load, does not read your browsing history, and does not
              collect page content in the background. Page metadata is read only at the moment you
              invoke Swearch on that page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">8. Contact</h2>
            <p>
              Privacy questions and deletion requests:{" "}
              <a href="mailto:privacy@swearch.app" className="text-accent hover:underline">
                privacy@swearch.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
