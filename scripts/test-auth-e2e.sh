#!/usr/bin/env bash
# Manual E2E checklist for unified auth. Run with web + extension dev servers up
# and the extension loaded unpacked from apps/extension/dist in Chrome.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Swearch Auth E2E Checklist ==="
echo ""

pass=0
fail=0
warn=0

ok() { echo "  PASS: $1"; pass=$((pass + 1)); }
bad() { echo "  FAIL: $1"; fail=$((fail + 1)); }
note() { echo "  NOTE: $1"; warn=$((warn + 1)); }

echo "[1] Automated unit + config tests"
if pnpm test:auth >/dev/null 2>&1; then
  ok "22 automated auth tests"
else
  bad "automated auth tests — run: pnpm test:auth"
fi

echo ""
echo "[2] Build artifacts"
for f in \
  apps/extension/dist/content/auth-sync.js \
  apps/extension/dist/background/service-worker.js \
  apps/extension/dist/manifest.json; do
  if [ -f "$f" ]; then ok "exists: $f"; else bad "missing: $f"; fi
done

echo ""
echo "[3] Environment alignment"
WEB_EXT_ID=$(grep -E '^NEXT_PUBLIC_EXTENSION_ID=' apps/web/.env.local 2>/dev/null | cut -d= -f2 || true)
if [ -n "$WEB_EXT_ID" ]; then
  ok "NEXT_PUBLIC_EXTENSION_ID is set ($WEB_EXT_ID)"
else
  bad "NEXT_PUBLIC_EXTENSION_ID missing in apps/web/.env.local"
fi

WEB_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' apps/web/.env.local 2>/dev/null | cut -d= -f2 || true)
EXT_URL=$(grep -E '^VITE_SUPABASE_URL=' apps/extension/.env.local 2>/dev/null | cut -d= -f2 || true)
if [ -n "$WEB_URL" ] && [ "$WEB_URL" = "$EXT_URL" ]; then
  ok "Supabase URL matches across web and extension"
else
  bad "Supabase URL mismatch (web=$WEB_URL, ext=$EXT_URL)"
fi

if grep -q 'http://localhost:3000/\*' apps/extension/dist/manifest.json; then
  ok "manifest externally_connectable includes localhost:3000"
else
  bad "manifest missing localhost:3000 in externally_connectable"
fi

echo ""
echo "[4] Web app reachability"
if curl -sf -o /dev/null -w '' http://localhost:3000/login; then
  ok "web app responds at http://localhost:3000/login"
else
  bad "web app not reachable — run: pnpm dev"
fi

echo ""
echo "[5] Manual Chrome steps (cannot automate in CI browser)"
note "Load extension from apps/extension/dist at chrome://extensions"
note "Confirm extension ID matches NEXT_PUBLIC_EXTENSION_ID in web .env.local"
note "Add https://<extension-id>.chromiumapp.org/* to Supabase redirect URLs"
echo ""
echo "  Test A — Web login -> Extension sync"
echo "    1. Sign in on http://localhost:3000 (Google or email)"
echo "    2. Open extension popup"
echo "    3. Expect: home view (not auth screen)"
echo ""
echo "  Test B — Extension Google login -> Web sync"
echo "    1. Sign out on both surfaces"
echo "    2. Extension popup -> Continue with Google"
echo "    3. Open http://localhost:3000/dashboard"
echo "    4. Expect: dashboard (not login redirect)"
echo ""
echo "  Test C — Sign out either surface"
echo "    1. Sign out on web -> reopen extension -> expect auth screen"
echo "    2. Sign in again -> sign out in extension -> refresh web -> expect /login"
echo ""
echo "  Test D — Web handoff link"
echo "    1. Extension auth screen -> 'Sign in on web app'"
echo "    2. Complete login in tab -> refocus extension popup"
echo "    3. Expect: session picked up automatically"
echo ""

echo "=== Summary ==="
echo "  Automated: $pass passed, $fail failed, $warn manual notes"
[ "$fail" -eq 0 ] || exit 1
