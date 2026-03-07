# CK-06: Swap Data Layer to Clerk Supabase Client

**Priority:** Critical — data operations won't work without this
**Estimate:** 25 min
**Model:** Sonnet

---

## 1. Tools

- Codebase with CK-01 through CK-05 complete
- CK-M1 SQL migration complete
- Terminal: `grep`, `npx tsc --noEmit`

## 2. Guardrails

- ❌ Do NOT delete `lib/supabase/server.ts` (service role client) — still needed for webhooks and background jobs
- ❌ Do NOT modify data layer business logic — only change which Supabase client is created
- ❌ Do NOT change any Telnyx webhook handlers — they use service role, not user auth
- ❌ Do NOT change any query patterns (`.from()`, `.select()`, `.eq()`) — only the client creation line

## 3. Knowledge

- Every function that previously called `createAuthClient()` or `createAuthServerClient()` now calls `createClerkSupabaseClient()` instead.
- The query patterns stay exactly the same — only the client creation changes.
- Some files may import BOTH the auth client AND `requireUser()`. The `requireUser()` calls were already replaced in CK-04, so you only need to swap the client import here.
- **Service role client stays for:**
  - Webhook handlers (`/api/telnyx/*`, `/api/ai-agent/*`)
  - Background jobs (data retention cleanup)
  - Any operation without user context
- After this task, the old `auth-server.ts` and `auth-client.ts` should have ZERO imports and can be deleted.

## 4. Memory

- Data layer files likely include: `lib/supabase/settings.ts`, `lib/actions/leads.ts`, `lib/actions/notes.ts`
- Some files may import `createAuthBrowserClient` for client-side operations — replace with `useClerkSupabase()` hook
- The `@supabase/ssr` package was used only for the old auth clients — may be removable after this task

## 5. Success Criteria

1. ✅ No remaining imports of `createAuthClient` or `createAuthServerClient` in any file
2. ✅ No remaining imports from `lib/supabase/auth-server` in any file
3. ✅ No remaining imports from `lib/supabase/auth-client` in any file
4. ✅ All user-facing data operations use `createClerkSupabaseClient()` (server) or `useClerkSupabase()` (client)
5. ✅ Service role client still used in webhook handlers and background jobs
6. ✅ `lib/supabase/auth-server.ts` deleted (no imports remain)
7. ✅ `lib/supabase/auth-client.ts` deleted (no imports remain)
8. ✅ `npx tsc --noEmit` passes clean
9. ✅ Creating a lead in the UI saves to Supabase with Clerk user ID as `agent_id`

## 6. Dependencies

- CK-03 (Clerk Supabase clients exist)
- CK-04 (API routes already use Clerk auth — so `requireUser()` imports are already gone from routes)
- CK-M1 (RLS policies reference `requesting_user_id()`)

**Files to find and update:**
```bash
grep -rn 'createAuthClient\|createAuthServerClient\|auth-server\|auth-client' \
  --include='*.ts' --include='*.tsx' lib/ app/ components/
```

## 7. Failure Handling

| Error | Cause | Solution |
|-------|-------|---------|
| RLS blocks all queries | `requesting_user_id()` returns null | Verify token is being passed. Check Supabase Dashboard → Logs. |
| Old test data not visible | Old `agent_id` was UUID, Clerk ID is string | Expected — old test data won't match. New data uses Clerk ID. |
| Import not found for clerk-client | File path wrong | Verify `lib/supabase/clerk-client.ts` exists from CK-03 |
| Client component uses server import | `createClerkSupabaseClient` used in `"use client"` file | Use `useClerkSupabase()` hook from `clerk-client-browser.ts` instead |
| `@supabase/ssr` removal breaks something | Some file still imports from it | Check with grep before removing the package |

## 8. Learning

- Document which files used `auth-server` vs `auth-client` (server vs browser pattern)
- Note if any client components needed the browser hook vs server client
- Log if `@supabase/ssr` had any other uses beyond auth

---

## 9. Step-by-Step Instructions

### Step 1: Find all files importing old auth clients

```bash
grep -rn 'auth-server\|auth-client\|createAuthClient\|createAuthServerClient\|createAuthBrowserClient' \
  --include='*.ts' --include='*.tsx' lib/ app/ components/
```

Make a list of every file found.

### Step 2: Replace imports in server-side files

For each file that runs on the server (API routes, server actions, `lib/` functions):

```typescript
// BEFORE:
import { createAuthClient } from "@/lib/supabase/auth-server"
const supabase = await createAuthClient()

// AFTER:
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
const supabase = await createClerkSupabaseClient()
```

### Step 3: Replace imports in client-side files

For each file with `"use client"` that used the browser auth client:

```typescript
// BEFORE:
import { createAuthBrowserClient } from "@/lib/supabase/auth-client"
const supabase = createAuthBrowserClient()

// AFTER:
import { useClerkSupabase } from "@/lib/supabase/clerk-client-browser"
const supabase = useClerkSupabase()
// Note: this is a hook, so it must be called inside a component body
```

### Step 4: Verify no old imports remain

```bash
grep -rn 'auth-server\|auth-client\|createAuthClient\|createAuthServerClient\|createAuthBrowserClient' \
  --include='*.ts' --include='*.tsx' .
# Should return ZERO results (excluding the old files themselves)
```

### Step 5: Delete old auth client files

```bash
rm lib/supabase/auth-server.ts
rm lib/supabase/auth-client.ts
```

### Step 6: Check if `@supabase/ssr` can be removed

```bash
grep -rn '@supabase/ssr' --include='*.ts' --include='*.tsx' .
# If zero results, remove the package:
bun remove @supabase/ssr
```

### Step 7: Build check

```bash
npx tsc --noEmit
bun run dev
```

---

**Next task:** CK-07
