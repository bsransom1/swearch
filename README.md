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
```

For the extension (`apps/extension/.env.local`):
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase status>
VITE_GOOGLE_CLIENT_ID=<your google oauth client id>
```

### 6. Google OAuth setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Enable **Google Drive API** + **Google Docs API**
3. Create OAuth credentials:
   - Web app for Supabase (add redirect URI from your Supabase dashboard)
   - Chrome Extension for `chrome.identity` (add your extension ID)
4. Copy the client ID into `VITE_GOOGLE_CLIENT_ID` and update `manifest.json`
5. Add the client ID + secret to your Supabase project under Authentication → Providers → Google

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

- [ ] Google OAuth for extension via `chrome.identity.launchWebAuthFlow`
- [ ] Token refresh in service worker
- [ ] Google Doc cached text refresh (check Drive API `modifiedTime`)
- [ ] Semantic Scholar rate limit retry with backoff
- [ ] Supabase Realtime subscriptions for live web app updates
- [ ] Citation export (Zotero, BibTeX)
- [ ] Team collaboration / sharing
