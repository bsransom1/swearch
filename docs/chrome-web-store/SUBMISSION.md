# Chrome Web Store Submission — Swearch v0.1.0

Status: **Ready to submit once the three manual items below are done.**

| Document | Purpose |
|----------|---------|
| [`DASHBOARD_COPY.md`](./DASHBOARD_COPY.md) | Every field to paste into the Developer Dashboard |
| [`REVIEWER_NOTES.md`](./REVIEWER_NOTES.md) | The "Notes for reviewer" block plus fixture details |
| [`CLEAN_PROFILE_QA.md`](./CLEAN_PROFILE_QA.md) | Manual smoke test on a fresh Chrome profile |
| [`ACCOUNT_DELETION.md`](./ACCOUNT_DELETION.md) | Deletion decision and operator runbook |

## Manual items owned by Brady

- [ ] Deploy the web app so `https://swearch.app/privacy` is live, then confirm in incognito
- [ ] Run [`CLEAN_PROFILE_QA.md`](./CLEAN_PROFILE_QA.md) end to end on a clean Chrome profile
- [ ] Share the reviewer export doc `1O3MSb6_7_cXhw9p25Ff_2pF29OwFCfacJmI5M520WJM` with **edit**
      access so the reviewer's Google account can complete an export

---

## Manifest and permissions

| Permission | Used for | Status |
|------------|----------|--------|
| `activeTab` | Context menu, sidebar | Keep |
| `storage` | Auth tokens, active project, session chat | Keep |
| `identity` | Google OAuth for Drive/Docs | Keep |
| `tabs` | Tab query, sendMessage, web↔extension auth sync | Keep |
| `scripting` | On-demand panel/sidebar injection | Keep |
| `contextMenus` | Right-click actions | Keep |
| `clipboardWrite` | Copy formatted output | Keep |
| `<all_urls>` | User-triggered panel on any paper URL | Keep |

`<all_urls>` justification, OAuth scope justifications, and data-usage disclosures are all in
[`DASHBOARD_COPY.md`](./DASHBOARD_COPY.md).

## Service worker

- No module-level auth or project state
- `onStartup` / `onInstalled` → `restoreSession()` + `restoreActiveProject()`
- Every panel-bridge handler runs inside `withAuthenticatedSession()` so an idle-terminated worker
  rehydrates from storage before doing work

## Privacy policy

- **Page:** [`apps/web/app/privacy/page.tsx`](../../apps/web/app/privacy/page.tsx)
- **URL:** https://swearch.app/privacy
- **Contact:** privacy@swearch.app
- Linked from `/login` and `/signup`; excluded from the middleware matcher so it never depends on an
  auth round-trip
- Audited against code on 2026-07-31. Corrections applied: OpenAlex (not Semantic Scholar) for paper
  discovery; per-project chat history disclosed; Google token handling described accurately
  (`chrome.identity` cache in the extension, Supabase session token on the web, no stored refresh
  tokens); chat and page metadata disclosed as going to Anthropic; `drive.readonly` described as
  list/read-linked rather than "export only"; retention and a 30-day deletion SLA added

## Account deletion

Email-request only for v0.1.0, with an explicit process and turnaround in the policy. See
[`ACCOUNT_DELETION.md`](./ACCOUNT_DELETION.md).

## Code quality

- No `eval()` or `new Function()` in extension source
- No remote scripts or remote fonts in the built popup/sidebar HTML
- `minify: "esbuild"` only, no obfuscation
- CSP: `script-src 'self'; object-src 'self'`

## Reviewer test account

| Field | Value |
|-------|-------|
| Email | `reviewer@swearch.app` |
| Password | `SwearchReview2026!` |
| Project | `testx` (active) |
| Fixtures | 1 paper, 2 highlights, linked doc `Swearch Reviewer Export Doc` (role `both`) |

Verified against the live database on 2026-07-31. Re-seed with
`node scripts/seed-reviewer-account.mjs` (requires `SUPABASE_SERVICE_ROLE_KEY`).

## Store assets

Screenshots (1280×800) in `docs/chrome-web-store/screenshots/png/`:
`01-context-menu.png`, `02-summarize-panel.png`, `03-sidebar-chat.png`, `04-sidebar-project.png`,
`05-google-doc-export.png`. Re-render with `pnpm store:screenshots`.

Promotional images in `docs/chrome-web-store/promo/`: `small-tile-440x280.png`,
`large-tile-920x680.png`, `marquee-1400x560.png`.

## Packaging

```bash
pnpm package:extension
```

Produces `apps/extension/swearch-extension-v0.1.0.zip` (305 KB, 22 files). The script forces
`VITE_WEB_APP_ORIGINS=https://swearch.app` so `http://localhost:3000/*` never ships in the store
build. **After packaging, run `pnpm build:extension` again before local development** or the loaded
`dist/` will not sync auth with `localhost:3000`.

Verified 2026-07-31 against the packaged zip:

- Manifest: `manifest_version: 3`, version `0.1.0`, real OAuth client ID injected, content-script
  and `externally_connectable` matches are `["https://swearch.app/*"]` only
- Permissions and `host_permissions` match the table above exactly
- OAuth scopes: `drive.readonly`, `documents`
- All four icons present: 16 / 32 / 48 / 128
- No `.env`, no `.map` source maps, no `.ts`/`.tsx` sources
- No `eval(` or `new Function(` anywhere in the bundles
- No remote script or font references in `src/popup/index.html`
- No service-role key, Anthropic key, or other secret-shaped strings; only the Supabase URL and
  anon key, which are safe to ship
- `pnpm lint` (tsc for both apps) and `pnpm test` (65 tests) pass

---

## Submit

1. Deploy the web app and verify `/privacy` in incognito
2. Run the clean-profile QA pass
3. Share the reviewer export doc with edit access
4. Upload the ZIP at https://chrome.google.com/webstore/devconsole
5. Fill the listing and privacy-practices forms from [`DASHBOARD_COPY.md`](./DASHBOARD_COPY.md)
6. Upload screenshots and promo tiles
7. Paste the reviewer block from [`REVIEWER_NOTES.md`](./REVIEWER_NOTES.md)
8. Submit for review
