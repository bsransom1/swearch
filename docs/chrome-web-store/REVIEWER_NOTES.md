# Chrome Web Store — Reviewer Notes

**Paste the block below into the Developer Dashboard → "Notes for reviewer" field.**

Verified against the live database on 2026-07-31: reviewer account exists, `testx` is the active
project, 2 highlights present, export doc `Swearch Reviewer Export Doc` linked with role `both`.

---

Swearch is a research assistant for academics. It only acts on explicit user action: right-clicking
selected text, or clicking the toolbar icon to open the sidebar. Nothing is injected on page load.

**Test account (email/password, no Google sign-in required to see core features):**

- Email: `reviewer@swearch.app`
- Password: `SwearchReview2026!`

The **testx** project is pre-loaded with one paper and 2 sample highlights on a squirrel ecology
study, plus a linked Google Doc for testing export.

**Core flow (no OAuth needed):**

1. Install, then click the Swearch icon in the toolbar. The in-page sidebar opens.
2. Sign in with the credentials above. You land on the **Chat** tab with **testx** active.
3. Open any research paper, e.g. https://arxiv.org/abs/2301.07041
4. Select a passage of at least 20 characters, right-click, and open the **Swearch** submenu. Six
   actions are available:
   - **Summarize selection** — AI summary panel near the selection
   - **Ask Swearch about this...** — ask a question about the excerpt
   - **Check relevance to testx** — relevance scored against the active project
   - **Add to testx** — saves the highlight to the project
   - **Extract key claims** — pulls discrete claims from the excerpt
   - **Copy formatted** — copies a formatted citation block to the clipboard
5. In the sidebar **Chat** tab, send a message, or click the brain icon to discover related papers
   via OpenAlex.
6. In the sidebar **Project** tab, review saved highlights and linked docs, and switch projects from
   the header dropdown.

**Google Docs export (optional, requires OAuth consent):**

In the sidebar go to **Settings → Connect** to grant Google access, then use **Export** in a
Summarize panel footer to append the formatted result to the linked doc. Two scopes are requested:

- `drive.readonly` — solely to list the reviewer's own Google Docs so one can be picked to link to a
  project, and to read docs explicitly linked as project context. No files are downloaded in bulk
  and nothing is modified with this scope.
- `documents` — to append content to a doc the user explicitly linked, only when the user clicks
  Export. Swearch never creates or deletes documents.

Export and "add to project" are independent actions: exporting does not save a highlight, and saving
does not write to the doc.

**Privacy policy:** https://swearch.app/privacy

**Homepage:** https://swearch.app

---

## Internal notes (do not paste)

- Fixtures are created by [`scripts/seed-reviewer-account.mjs`](../../scripts/seed-reviewer-account.mjs)
  and require `SUPABASE_SERVICE_ROLE_KEY`. Re-run before submission if the project is reset.
- **Manual blocker:** the export doc `1O3MSb6_7_cXhw9p25Ff_2pF29OwFCfacJmI5M520WJM` must be shared
  with **edit** access to whatever Google account the reviewer uses, otherwise the export step fails
  with a permissions error. This cannot be done from code. Simplest option: set the doc to "Anyone
  with the link — Editor" for the duration of the review.
- Full manual smoke test lives in [`CLEAN_PROFILE_QA.md`](./CLEAN_PROFILE_QA.md).
- Deletion process and runbook: [`ACCOUNT_DELETION.md`](./ACCOUNT_DELETION.md).
