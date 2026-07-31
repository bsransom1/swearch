# Account Deletion — Process and Runbook

**Decision (v0.1.0 submission):** deletion stays an **email-request process**. No self-serve
"Delete my account" button ships in this release. The privacy policy now commits to a specific
process and turnaround, so this runbook exists to make that commitment executable.

Rationale: the schema already cascades cleanly from `auth.users`, so a self-serve delete is a
medium-sized addition (server action with service-role key, confirmation modal, confirmation page)
rather than a blocker. Chrome Web Store does not require an in-product delete button for the
scopes Swearch requests, only a clear, honest disclosure of how deletion works.

---

## What the policy commits to

From [`apps/web/app/privacy/page.tsx`](../../apps/web/app/privacy/page.tsx) section 5:

- User emails `privacy@swearch.app` from the address on the account, subject `Delete my account`
- Receipt confirmed within **5 business days**
- Auth record and all associated rows deleted within **30 days**
- Content already exported into the user's own Google Docs stays in their Drive

---

## Runbook (operator steps)

1. **Verify identity.** The request must come from the email address on the account. If it does not,
   reply asking them to send from the account address. Do not delete on an unverified request.

2. **Reply to confirm receipt** within 5 business days.

3. **Delete the auth user.** In the Supabase dashboard: Authentication → Users → find the email →
   Delete user. This is the only step required for cloud data; see cascade chain below.

4. **Verify the cascade.** Run in the SQL editor, substituting the user id:

   ```sql
   select
     (select count(*) from public.profiles where id = '<user_id>')              as profiles,
     (select count(*) from public.research_projects where user_id = '<user_id>') as projects,
     (select count(*) from public.papers_analyzed where user_id = '<user_id>')   as papers,
     (select count(*) from public.highlights where user_id = '<user_id>')        as highlights,
     (select count(*) from public.paper_recommendations where user_id = '<user_id>') as recommendations,
     (select count(*) from public.project_google_docs where user_id = '<user_id>')   as project_docs;
   ```

   All counts must be `0`.

5. **Reply to close the loop**, noting that Google Docs content they exported remains in their Drive
   and that they can revoke Swearch's Drive/Docs access at
   https://myaccount.google.com/permissions.

---

## Cascade chain (why step 3 is sufficient)

Defined in [`supabase/migrations/20240101000000_initial.sql`](../../supabase/migrations/20240101000000_initial.sql)
and [`20240701000000_project_google_docs.sql`](../../supabase/migrations/20240701000000_project_google_docs.sql):

```
auth.users
  └── profiles (id references auth.users ON DELETE CASCADE)
        ├── research_projects (user_id ON DELETE CASCADE)
        │     ├── papers_analyzed (project_id ON DELETE CASCADE)
        │     │     └── highlights (paper_id ON DELETE CASCADE)
        │     ├── highlights (project_id ON DELETE CASCADE)
        │     ├── paper_recommendations (project_id ON DELETE CASCADE)
        │     └── project_google_docs (project_id ON DELETE CASCADE)
        ├── papers_analyzed (user_id ON DELETE CASCADE)
        ├── highlights (user_id ON DELETE CASCADE)
        ├── paper_recommendations (user_id ON DELETE CASCADE)
        └── project_google_docs (user_id ON DELETE CASCADE)
```

Every user-scoped table cascades from `profiles`, which cascades from `auth.users`. Deleting the
auth user removes all rows. `paper_recommendations.source_paper_id` is `ON DELETE SET NULL`, but the
row itself is removed by the `user_id`/`project_id` cascade.

## Device-side data

Nothing needs to be done by the operator. On the user's machine:

- `chrome.storage.local` (sign-in tokens, active project) clears on sign out, and is orphaned and
  unusable once the auth user is gone
- `chrome.storage.session` (per-project chat history, session highlight IDs) clears when the browser
  closes
- Google Drive/Docs tokens are held by Chrome's `chrome.identity` cache, revocable by the user at
  https://myaccount.google.com/permissions

Uninstalling the extension removes both storage areas.

---

## If self-serve is added later

Scope, for reference:

| Piece | Notes |
|-------|-------|
| Settings UI | Confirmation modal requiring the user to type `DELETE` |
| Server action | Needs `SUPABASE_SERVICE_ROLE_KEY` (server-only) to call `auth.admin.deleteUser` |
| Google grant | `chrome.identity.removeCachedAuthToken` on the extension side; web token is session-only |
| Post-delete | Sign out, redirect to a public confirmation page |
| Hard vs soft | Hard delete is simpler and matches the current policy language. Soft delete (flag + purge job) would allow an undo window but requires changing the policy wording and adding a scheduled purge. |
