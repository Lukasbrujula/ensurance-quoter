# CK-07: Final Cleanup + Build Verification

**Priority:** High — ensures production readiness
**Estimate:** 15 min
**Model:** Sonnet

---

## 1. Tools

- Codebase with CK-01 through CK-06 complete
- CK-M1 SQL migration complete
- Terminal: `grep`, `npx tsc --noEmit`, `bun run build`

## 2. Guardrails

- ❌ Do NOT introduce new features — this is cleanup only
- ❌ Do NOT change any business logic
- ❌ Do NOT modify carrier data, quote engine, or Telnyx integration
- ❌ Do NOT remove `@supabase/supabase-js` — still needed for data access

## 3. Knowledge

- This is the final sweep. Find any remaining references to old Supabase auth patterns, dead code, unused imports, and TypeScript errors.
- A successful `bun run build` means the production build works.
- `CODEBASE_AUDIT.md` needs to be updated to reflect the new auth system (Clerk instead of Supabase Auth).

## 4. Memory

- Phase 4 section of CODEBASE_AUDIT.md describes Supabase Auth — needs rewriting
- Section 5 (Auth System) lists all the old auth files — needs complete replacement
- Section 8 (Environment Variables) needs Clerk vars added
- Section 10 (Known Gaps) mentions "SMTP for auth emails" — no longer relevant with Clerk

## 5. Success Criteria

1. ✅ `grep -rn 'supabase.*auth\|auth\.uid\|requireUser\|createAuthClient\|auth-provider\|components/auth' --include='*.ts' --include='*.tsx' .` returns ZERO results
2. ✅ `npx tsc --noEmit` exits with 0 errors
3. ✅ `bun run build` completes successfully
4. ✅ No unused `@supabase/ssr` package (removed in CK-06 or here)
5. ✅ `CODEBASE_AUDIT.md` section 5 updated to reflect Clerk auth
6. ✅ `CODEBASE_AUDIT.md` section 8 updated with Clerk environment variables
7. ✅ No dead files remaining from old auth system

## 6. Dependencies

- ALL previous tasks complete (CK-01 through CK-06 + CK-M1)

---

## 7. Failure Handling

| Error | Cause | Solution |
|-------|-------|---------|
| TypeScript error on deleted import | Some file still references old auth | Find with grep, update the import |
| Build fails on dynamic import | Old auth page still referenced in route | Check `app/auth/` directory is clean |
| `@supabase/ssr` still imported | Missed in CK-06 | Find the import with grep, replace or remove |

## 8. Learning

- Document the total lines of code removed (old auth) vs added (Clerk integration)
- Note any unexpected complications for future reference
- Update CONVERSATION_INDEX.md with this migration as a new chat entry

---

## 9. Step-by-Step Instructions

### Step 1: Dead code sweep

```bash
# Find ANY remaining old auth references
grep -rn 'supabase.*auth\|auth\.uid\|requireUser\|createAuthClient' --include='*.ts' --include='*.tsx' .
grep -rn 'auth-provider\|components/auth' --include='*.ts' --include='*.tsx' .
grep -rn '@supabase/ssr' --include='*.ts' --include='*.tsx' .

# Clean up anything found
```

### Step 2: Check for orphaned files

```bash
ls app/auth/
# Should only contain: login/ and register/ (with Clerk components)
# Should NOT contain: confirm/, password/, callback/

ls lib/supabase/
# Should contain: clerk-client.ts, clerk-client-browser.ts, server.ts
# Should NOT contain: auth-server.ts, auth-client.ts
```

### Step 3: Check for unused packages

```bash
# If @supabase/ssr is no longer imported anywhere:
grep -rn '@supabase/ssr' --include='*.ts' --include='*.tsx' .
# If zero results:
bun remove @supabase/ssr
```

### Step 4: TypeScript check

```bash
npx tsc --noEmit
# Must exit with 0 errors
```

### Step 5: Full production build

```bash
bun run build
# Must complete successfully
```

### Step 6: Update CODEBASE_AUDIT.md

Update **Section 5 (Auth System)** to:

```markdown
## 5. Auth System (Clerk Migration)

| Component | File | Purpose |
|-----------|------|---------|
| Clerk Provider | `app/layout.tsx` | `<ClerkProvider>` wraps entire app |
| Middleware | `middleware.ts` (root) | `clerkMiddleware()` with public route matchers |
| Server Supabase client | `lib/supabase/clerk-client.ts` | Clerk JWT → Supabase auth for server-side queries |
| Browser Supabase client | `lib/supabase/clerk-client-browser.ts` | `useClerkSupabase()` hook for client components |
| Auth guard | `lib/middleware/auth-guard.ts` | API protection: shared secret OR Clerk session |
| Service role client | `lib/supabase/server.ts` | Bypasses RLS for webhooks/background jobs |

**Key patterns:**
- All server actions/routes call `auth()` from `@clerk/nextjs/server`
- RLS uses `requesting_user_id()` Postgres function (extracts Clerk ID from JWT `sub` claim)
- Telnyx webhooks use INTERNAL_API_SECRET, not Clerk auth
- User IDs are strings (e.g., `user_2abc123`), not UUIDs
```

Update **Section 8 (Environment Variables)** to add:

```markdown
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Public |
| `CLERK_SECRET_KEY` | Clerk | Server |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk | Public |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk | Public |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Clerk | Public |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Clerk | Public |
```

Update **Section 10 (Known Gaps)** to remove:
- "SMTP for auth emails" — Clerk handles emails
- "Email enumeration protection" — Clerk handles this
- "Weak password policy" — Clerk handles this

### Step 7: Manual smoke test checklist

Print this for Lukas to verify:

```
[ ] Sign up with a new email through Clerk
[ ] Verify email (Clerk handles this automatically)
[ ] Land on /leads after sign-in
[ ] Create a new lead
[ ] Check Supabase — agent_id should be Clerk string ID (user_2abc...)
[ ] Sign out via UserButton
[ ] Confirm /leads redirects to sign-in
[ ] Sign in as a different user
[ ] Confirm first user's lead is NOT visible (RLS working)
[ ] Run a quote — results return correctly
[ ] Commission settings load and save
[ ] Telnyx calling still works (if testable)
```

---

**Migration complete.** 🎉
