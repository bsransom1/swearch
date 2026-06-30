# Swearch — Research Condensation

Highlight text on research papers, get AI-powered structured summaries analyzed against your active research project, and export directly to your linked Google Doc.

## Architecture

- **Web App** (`apps/web`): Next.js 15, Supabase auth, project + paper management
- **Extension** (`apps/extension`): Chrome MV3, content script, Vite + React popup
- **Edge Function** (`supabase/functions/analyze-highlight`): Claude claude-sonnet-4-6 via Anthropic SDK — API key never leaves the server
- **Database** (`supabase/migrations`): PostgreSQL with RLS, all data scoped per user

## Setup

### 1. Prerequisites

```bash
node --version   # 20+
npm install -g pnpm
brew install supabase/tap/supabase
```

### 2. Clone and install

```bash
pnpm install
```

### 3. Start Supabase locally

```bash
supabase start
supabase db push
supabase gen types typescript --local > packages/shared/types/database.ts
```

### 4. Set Edge Function secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 5. Environment variables

```bash
cp .env.example .env.local
# Fill in SUPABASE_URL and SUPABASE_ANON_KEY from `supabase status`
```

For the web app (`apps/web/.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
NEXT_PUBLIC_EXTENSION_ID=<extension id from chrome://extensions>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For the extension (`apps/extension/.env.local`):
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase status>
VITE_GOOGLE_CLIENT_ID=<your google oauth client id>
VITE_WEB_APP_ORIGINS=http://localhost:3000
```

### 6. Google OAuth setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Enable **Google Drive API** + **Google Docs API**
3. Create OAuth credentials:
   - Web app for Supabase (add redirect URI from your Supabase dashboard)
   - Chrome Extension for `chrome.identity` (add your extension ID)
4. Copy the client ID into `VITE_GOOGLE_CLIENT_ID` and update `manifest.json`
5. Add the client ID + secret to your Supabase project under Authentication → Providers → Google

**Important:** You need **two separate** OAuth clients:
- **Web application** → Supabase Google provider (Swearch login)
- **Chrome Extension** → `VITE_GOOGLE_CLIENT_ID` (Drive/Docs export via `chrome.identity`)

### 6c. Google Docs export (extension)

Export does **not** use Supabase auth or Next.js middleware. The extension calls Google APIs directly with `chrome.identity.getAuthToken`.

1. In Google Cloud Console, enable **Google Drive API** and **Google Docs API**
2. Create an OAuth client of type **Chrome Extension** (not Web)
3. Add your extension ID from `chrome://extensions` to that credential
4. Put the Chrome Extension client ID in `apps/extension/.env.local` as `VITE_GOOGLE_CLIENT_ID`
5. Rebuild and reload the extension (`pnpm build:extension`)
6. In the extension popup → **Settings** → **Connect Google Drive** → **Load my Google Docs** → pick a doc → **Save**

If export fails with "bad client id", the extension ID in Google Cloud does not match the loaded extension.

The web app and extension share one Supabase session. Either surface can sign in
(email/password or Google) and the session is mirrored to the other:

- web -> extension uses `chrome.runtime.sendMessage` (requires `NEXT_PUBLIC_EXTENSION_ID` and the extension's `externally_connectable` matches)
- extension -> web uses an auth-sync content script that pushes the session into the page

To enable Google sign-in inside the extension, add the extension's redirect URL to
Supabase under Authentication → URL Configuration → Redirect URLs:

```
https://<extension-id>.chromiumapp.org/*
```

The `<extension-id>` is shown at `chrome://extensions` after loading the unpacked
build. For a stable ID across reloads, add a `key` field to `manifest.json`
(generate a key pair once and reuse the public key). Keep the existing web
callback `http://localhost:3000/auth/callback` (plus your production URL) too.

### 7. Run

```bash
# Web app at http://localhost:3000
pnpm dev:web

# Extension — builds to apps/extension/dist/
pnpm dev:extension
# Then: Chrome → Extensions → Load unpacked → select apps/extension/dist/
```

### 8. Deploy

```bash
# Web app (Vercel)
cd apps/web && vercel

# Edge Function
supabase functions deploy analyze-highlight --project-ref your-project-ref

# Extension
pnpm build:extension
# Zip apps/extension/dist/ and upload to Chrome Web Store
```

## TODO (Phase 2)

- [x] Google OAuth for extension via `chrome.identity.launchWebAuthFlow`
- [x] Token refresh in service worker
- [x] Unified web + extension session sync
- [ ] Google Doc cached text refresh (check Drive API `modifiedTime`)
- [ ] Semantic Scholar rate limit retry with backoff
- [ ] Supabase Realtime subscriptions for live web app updates
- [ ] Citation export (Zotero, BibTeX)
- [ ] Team collaboration / sharing
