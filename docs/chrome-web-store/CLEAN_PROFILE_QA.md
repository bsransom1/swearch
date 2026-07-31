# Clean-Profile QA Checklist

Simulates what a Chrome Web Store reviewer actually does. **Run this end to end on a fresh Chrome
profile before every submission.** An agent cannot perform this pass; it requires a real browser
profile, real Google consent screens, and human judgement on the consent copy.

Keep the service worker console open throughout: `chrome://extensions` → Swearch → **service worker**.

---

## 0. Build the artifact

```bash
pnpm build:extension
```

- [ ] Build completes with no errors
- [ ] `apps/extension/dist/manifest.json` shows the expected version, permissions, and a real
      (non-placeholder) OAuth client ID

Use `pnpm build:extension` (not `pnpm package:extension`) for this pass. The packaging script strips
`http://localhost:3000/*` from the manifest for the store build, which would break section 2's
web↔extension auth sync test against a local web app. If you last ran `package:extension`, rebuild
before loading `dist/`.

---

## 1. Fresh profile and first install

- [ ] Create a brand-new Chrome profile (no extensions, not signed into Google yet)
- [ ] `chrome://extensions` → Developer mode on → **Load unpacked** → `apps/extension/dist`
- [ ] Extension loads with no manifest warnings
- [ ] Icon renders crisply in the toolbar at default size
- [ ] Service worker console shows no errors on install
- [ ] Right-click on selected text on any page shows the **Swearch** menu with all 6 actions
- [ ] No Swearch UI appears anywhere on page load before any user action
- [ ] No Google consent prompt has appeared yet (should only appear on first Drive/Docs use)

---

## 2. Sign up and sign in

### Extension, email/password

- [ ] Click the Swearch toolbar icon → sidebar opens and pushes page content
- [ ] Sign up with a fresh email/password
- [ ] Lands in the signed-in Chat view
- [ ] Sign out, sign back in with the same credentials

### Web app, email/password

- [ ] Visit the web app → sign up or sign in
- [ ] Redirects to `/projects`
- [ ] `/privacy` loads while signed out in an incognito window with no redirect and no console errors

### Google sign-in

- [ ] Extension: sign in with Google → consent screen appears → returns to Chat signed in
- [ ] Web app: sign in with Google → returns to `/projects` signed in
- [ ] Signing in on one surface propagates the session to the other (open both, reload)

### Session persistence

- [ ] Fully quit and reopen Chrome → extension is still signed in

---

## 3. Google Drive / Docs consent

- [ ] Extension Settings → **Connect** Google Drive
- [ ] Consent screen lists only: see and download your Google Drive files (read-only), and see,
      create, and edit your Google Docs documents
- [ ] Scope descriptions are accurate for what Swearch does and not alarming for a research tool
- [ ] After consent, Settings shows Google Drive: **Connected**

---

## 4. Project setup

- [ ] Web app: create a project with a name and description
- [ ] Project detail: link a Google Doc with role **both** (context and export)
- [ ] Doc appears in the linked-docs list with both role badges
- [ ] Extension header shows this project as active (or switch to it from the dropdown)

---

## 5. Context-menu actions on a real paper

Use a real paper, e.g. `https://arxiv.org/abs/2301.07041` or a PubMed article. Select a passage of
at least 20 characters for each action.

- [ ] **Summarize selection** — panel opens near selection, returns a summary
- [ ] **Ask Swearch about this...** — accepts a question, returns an answer
- [ ] **Check relevance to {project}** — returns project-scoped relevance
- [ ] **Add to project** — saves the highlight
- [ ] **Extract key claims** — returns claims (or a clean empty state)
- [ ] **Copy formatted** — clipboard contains formatted text
- [ ] No errors in the page console or service worker console for any action
- [ ] Panel is visually intact on a dark-themed site and a light-themed site
- [ ] Selection under 20 characters does not offer the Swearch menu

### Regression: export is independent of save

- [ ] From a Summarize panel, click **Export** only → content appends to the linked Google Doc, and
      the highlight is **not** added to the project
- [ ] From another Summarize panel, click **Add to project** only → highlight is saved, and nothing
      is appended to the Doc
- [ ] Both buttons remain independently clickable in the same panel session

### Regression: Docs formatting

- [ ] Exported content in the Google Doc has no unwanted auto-numbering or bullet list formatting
- [ ] Title, quote, section labels, relevance block, and citation all render as expected

---

## 6. Sidebar chat

- [ ] Open sidebar → Chat tab
- [ ] Send a message → reply arrives and references project context (linked doc or saved highlights)
- [ ] **Find related papers** (brain icon) → prompt and results append at the **end** of the
      conversation, never at the top
- [ ] Add a discovered paper to the project → confirmation message appends at the end
- [ ] Brain icon is disabled with a cooldown tooltip immediately after a search
- [ ] Brain icon is disabled on a non-paper page (e.g. a search results page)

### Regression: project switch resets chat

- [ ] With chat history present, switch active project from the header dropdown
- [ ] Chat resets to the new project's history (or a fresh welcome), not the previous project's
- [ ] No thinking spinner or stale in-flight reply leaks into the new project's chat
- [ ] Switch back → the first project's chat history is restored
- [ ] Send a message, switch projects mid-request → the reply never appears in the new chat

### Session tab

- [ ] Session tab lists highlights captured during this browser session

---

## 7. Web app review surfaces

- [ ] `/projects` lists projects with paper and highlight counts and the linked doc label
- [ ] Project detail: index list, detail pane, and right sidebar all render with no empty gap
- [ ] Selecting a highlight in the index shows its detail; Escape returns to overview
- [ ] Keyboard up/down navigates the highlight index
- [ ] Filters (by paper / all / by type, plus search and date) narrow results correctly
- [ ] `/settings` renders; Google Drive reconnect starts an OAuth flow
- [ ] `/privacy` is reachable from `/login` and `/signup`
- [ ] Legacy paths `/dashboard`, `/highlights`, `/papers`, `/docs`, `/activity` redirect to
      `/projects` rather than 404ing

---

## 8. Uninstall

- [ ] `chrome://extensions` → Remove Swearch
- [ ] Context menu entries disappear
- [ ] No background activity remains in `chrome://extensions` or the task manager
- [ ] `chrome://settings/content/all` shows no lingering Swearch storage
- [ ] Swearch no longer appears under https://myaccount.google.com/permissions after the user
      revokes access there (revoking is a separate, user-initiated step)

---

## Sign-off

| Item | Owner | Status |
|------|-------|--------|
| Sections 0 through 8 above | Brady, manual on a clean profile | required before submission |
| `https://swearch.app/privacy` live in incognito | Brady, after web deploy | required before submission |
| Reviewer export Doc shared with edit access | Brady, in Google Drive | required before submission |
