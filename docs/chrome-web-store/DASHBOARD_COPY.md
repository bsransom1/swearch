# Developer Dashboard — Copy/Paste Reference

Everything the Chrome Web Store submission form asks for, in the order the dashboard asks for it.
All copy here is consistent with the privacy policy at https://swearch.app/privacy as of
2026-07-31. If the policy changes, update both.

---

## Store listing

**Name** (45 char max)

```
Swearch — Research Condensation
```

**Short description** (132 char max — the string below is 118)

```
Highlight any paper for AI summaries, claims, and relevance. Organize by project and export straight to Google Docs.
```

**Category:** Productivity → Workflow & Planning

**Language:** English (United States)

**Detailed description**

```
Swearch turns reading papers into structured, reusable research notes.

Select any passage on any paper — arXiv, PubMed, a journal site, a university repository, a PDF-backed preprint — right-click, and pick a Swearch action. A panel opens right at your selection with the result. Nothing is injected until you ask for it.

WHAT YOU CAN DO FROM A SELECTION

• Summarize selection — a tight summary of what the passage actually says
• Ask Swearch about this... — ask a question about the excerpt and get an answer grounded in it
• Check relevance to your project — how this passage connects to the project you're working on
• Add to project — save the highlight with its AI analysis, methodology, and findings
• Extract key claims — pull out the discrete claims worth citing
• Copy formatted — a clean, citation-ready block on your clipboard

PROJECTS KEEP IT ORGANIZED

Create a project per paper, chapter, grant, or literature review. Every highlight, saved paper, and chat lives inside it. Switch projects from the sidebar header and the whole workspace follows — including the AI's context.

A SIDEBAR THAT KNOWS YOUR WORK

Click the Swearch icon for an in-page sidebar. Chat with an assistant that already knows your project's linked documents, saved highlights, and papers, so you don't have to re-explain your research every time. One click on the brain icon finds related papers via OpenAlex, and you can save the good ones to the project.

EXPORT TO GOOGLE DOCS

Link a Google Doc to a project once. From then on, Export appends your formatted highlight — quote, summary, methodology, findings, relevance, and citation — to the end of that doc. Your writing environment stays where it already is.

REVIEW ON THE WEB

The Swearch web app gives you the wide view: browse and filter every highlight in a project, read the AI analysis side by side with the source, and manage your linked documents.

PRIVACY

Swearch activates only when you act. It does not read your browsing history and does not collect page content in the background. Your data is scoped to your account with row-level security. It is never sold or used for advertising. Full policy: https://swearch.app/privacy
```

---

## Privacy practices

### Single purpose

```
Swearch is a research condensation tool. Its single purpose is to let a user select text on an academic paper, receive AI-generated structured analysis of that text (summary, methodology, findings, key claims, and relevance to the user's research project), and save or export that analysis into the user's own project workspace or linked Google Doc.
```

### Permission justifications

**`activeTab`**

```
Used to read the user's current selection and page title/URL at the moment they invoke a Swearch context-menu action or open the sidebar. This is what lets the panel appear at the selection and attribute the highlight to the correct paper.
```

**`storage`**

```
Stores the user's Swearch sign-in session and active project selection in chrome.storage.local so they do not have to sign in on every page, and stores per-project chat history and session highlight IDs in chrome.storage.session, which clears when the browser closes. No browsing history is stored.
```

**`identity`**

```
Used with chrome.identity.getAuthToken to obtain a Google OAuth token so the user can list their own Google Docs, link one to a project, and append exports to it. The token is managed by Chrome's identity cache, not stored by the extension.
```

**`tabs`**

```
Used to identify the active tab when injecting the on-demand panel or sidebar, to send messages to the correct tab, and to synchronize the sign-in session between the Swearch web app tab and the extension so the user only signs in once.
```

**`scripting`**

```
Used to inject the highlight panel and the sidebar into the current page on demand — only after the user chooses a Swearch context-menu action or clicks the toolbar icon. Nothing is injected at page load.
```

**`contextMenus`**

```
Provides the Swearch right-click submenu on selected text, which is the primary way the extension is invoked. The menu only appears for text selections.
```

**`clipboardWrite`**

```
Used by the "Copy formatted" action to place a citation-ready block of the user's highlight on the clipboard when they explicitly choose that action.
```

**Host permission `<all_urls>`**

```
Swearch's core functionality — a right-click context menu on selected text and a Shadow DOM panel injected at the selection point — must work on any research paper or academic webpage. Academic content is hosted across thousands of domains (arXiv.org, PubMed, university repositories, journal publishers, preprint servers, institutional databases) with no predictable URL pattern, so an enumerated match list is not possible. Swearch only activates on explicit user action: choosing an item from its context menu, or clicking its toolbar icon. It does not inject any code, scripts, or UI on page load, does not read browsing history, does not collect page content passively, and does not transmit anything without user initiation. The <all_urls> permission is required solely to support on-demand, user-triggered activation across the unpredictable domain landscape of academic research.
```

**Remote code use:** No. All JavaScript is bundled in the package. No remote scripts, no `eval()`,
no `new Function()`, no remotely hosted fonts. CSP is `script-src 'self'; object-src 'self'`.

### Data usage disclosures

Check these categories and nothing else:

| Category | Check | What to describe |
|----------|-------|------------------|
| Personally identifiable information | Yes | Email address and name, from account sign-in |
| Authentication information | Yes | Swearch session token; Google OAuth token obtained via `chrome.identity` |
| User activity | Yes | Only user-initiated actions inside Swearch: highlights captured, chat messages sent, papers saved |
| Website content | Yes | Text the user selects, plus the page title, URL, and where available abstract and DOI, read only at the moment the user invokes Swearch |
| Health, financial, personal communications, location, web history | No | — |

Certifications to check:

- [x] I do not sell or transfer user data to third parties, outside of approved use cases
- [x] I do not use or transfer user data for purposes unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

Third parties that receive data, if a free-text field is offered:

```
Anthropic (Claude API, via Supabase Edge Functions) receives selected text, chat messages, page metadata, and project context to generate the analysis the user requested. OpenAlex receives a search query derived from the page title or abstract when the user requests related papers. Google Drive and Docs APIs receive OAuth-scoped requests the user initiates. Supabase hosts authentication, the database, and the server functions. No advertising networks, analytics brokers, or data resellers.
```

**Privacy policy URL:** `https://swearch.app/privacy`

---

## OAuth consent screen — scope justifications

These go in the Google Cloud OAuth verification form, not the Chrome Web Store form, but the
wording should match what reviewers see.

**`https://www.googleapis.com/auth/drive.readonly`**

```
Swearch needs to show the user a list of their own Google Docs so they can choose which document to link to a research project, and to read the text of documents they explicitly link as project context for the AI assistant. It calls the Drive files.list endpoint filtered to mimeType 'application/vnd.google-apps.document' and reads only documents the user has explicitly linked. It does not enumerate, download, or scan the rest of the user's Drive, and it never modifies anything with this scope. A narrower scope is not sufficient because drive.file only exposes files created or opened through a Google Picker session, and the user's existing research documents predate their use of Swearch.
```

**`https://www.googleapis.com/auth/documents`**

```
Swearch appends the user's own research highlight — quote, AI summary, methodology, findings, relevance, and citation — to the end of a Google Doc that the user explicitly linked to their project, and only when the user clicks Export. It uses documents.batchUpdate with insertText and formatting requests targeting the end of the document body. It never creates documents, never deletes content, and never modifies documents the user has not linked. This scope is also used to read linked documents that serve as AI project context.
```

---

## Fields that had to be inferred from code

Flagging these so they can be corrected if the product intent differs:

- **Category choice** (Productivity → Workflow & Planning) is a judgement call. "Education" is a
  defensible alternative given the academic audience; Productivity was chosen because the value
  proposition is note capture and export, not learning content.
- **Detailed description** was written from the shipped feature set rather than from existing
  marketing copy, since no long-form marketing copy exists in the repo.
- **`drive.readonly` justification** asserts that `drive.file` is insufficient. That is true for the
  current implementation (a custom doc list built on `files.list`, no Google Picker). If a Picker
  flow is ever adopted, this justification must be rewritten or the scope narrowed.
- **"User activity" data category** was checked because saved highlights and chat messages are
  arguably activity records. It is a conservative read; Swearch records no clickstream or telemetry.
