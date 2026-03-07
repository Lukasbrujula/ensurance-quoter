# CK-04: Update All API Routes + Auth Guard to Use Clerk auth()

**Priority:** Critical — API routes won't authenticate without this
**Estimate:** 30 min
**Model:** Sonnet

---

## 1. Tools

- Codebase with CK-01, CK-02, CK-03 complete
- CK-M1 SQL migration complete (Lukas confirmed)
- Terminal: `find`, `grep`, `npx tsc --noEmit`

## 2. Guardrails

- ❌ Do NOT remove `INTERNAL_API_SECRET` support from auth-guard — Telnyx webhooks need it
- ❌ Do NOT modify the service role Supabase client
- ❌ Do NOT change any business logic in API routes — only the auth check at the top of each handler
- ❌ Do NOT modify Telnyx webhook routes (`/api/telnyx/*`, `/api/ai-agent/*`) — they use shared secret, not user auth
- ❌ Do NOT change the rate limiting logic in any route

## 3. Knowledge

- `auth()` from `@clerk/nextjs/server` is an async function that returns `{ userId, sessionId, getToken }`.
- If `userId` is null, the user isn't authenticated. This replaces `requireUser()` from Supabase Auth.
- The `userId` from Clerk is a string like `user_2nDKt8XmkFJ` — not a UUID.
- `auth-guard.ts` currently has two checks: (1) shared secret header, (2) Supabase session cookies.
- After migration: (1) shared secret header (KEEP), (2) Clerk `auth()` (REPLACE Supabase check).
- Any route that previously used `user.id` as a UUID now gets a string. If there's UUID validation on `agentId`, remove it.

## 4. Memory

- 13 API endpoints total — see CODEBASE_AUDIT.md section 1
- `auth-guard.ts` in `lib/middleware/` uses timing-safe comparison for shared secret
- Telnyx webhook routes use shared secret auth ONLY — no user session
- Routes that need user auth: `/api/quote`, `/api/chat`, `/api/chat/proactive`, `/api/enrichment`, `/api/coaching`, `/api/call-summary`, `/api/call-log`, `/api/call-log/[leadId]`, `/api/call-log/counts`, `/api/transcribe/*`, `/api/telnyx/token`, `/api/telnyx/credentials`, `/api/settings`

## 5. Success Criteria

1. ✅ `auth-guard.ts` checks Clerk `auth()` as fallback after shared secret
2. ✅ All 13 API routes use Clerk `auth()` or updated auth-guard instead of `requireUser()`
3. ✅ Telnyx webhook routes still work with `INTERNAL_API_SECRET` only
4. ✅ No remaining imports of `requireUser` from `auth-server.ts` in any API route
5. ✅ No UUID validation/casting on `agentId` / `userId` (now a string)
6. ✅ `npx tsc --noEmit` passes
7. ✅ API returns 401 when called without authentication

## 6. Dependencies

- CK-01 (Clerk SDK installed)
- CK-03 (Clerk Supabase client available)
- CK-M1 (RLS policies updated for Clerk IDs)

**Files to read before starting:**
```bash
cat lib/middleware/auth-guard.ts
find app/api -name 'route.ts' | head -20
# Then read each route file that imports requireUser or auth-guard
grep -rn 'requireUser\|auth-guard' --include='*.ts' app/api/
```

## 7. Failure Handling

| Error | Cause | Solution |
|-------|-------|---------|
| `auth()` returns `{ userId: null }` | Route not behind `clerkMiddleware` | Check `middleware.ts` matcher includes `/api/(.*)` |
| Telnyx webhooks return 401 | Removed shared secret check accidentally | Ensure auth-guard checks `INTERNAL_API_SECRET` FIRST, before Clerk |
| Type mismatch on userId (expects UUID) | Old code validates agent_id as UUID | Remove any UUID validation — Clerk IDs are strings |
| `auth` import not found | Wrong import path | Must be `import { auth } from "@clerk/nextjs/server"` |
| Rate limiter uses old user ID format | Rate limit key was UUID-based | Update to use string userId |

## 8. Learning

- Document which routes used `requireUser()` directly vs which used `auth-guard` — the patterns may differ
- Note if any route had UUID validation on `agentId` that needed removal
- Log if any route had special handling for `user.email` or `user.user_metadata` that needs Clerk equivalents

---

## 9. Step-by-Step Instructions

### Step 1: Update `lib/middleware/auth-guard.ts`

Replace the Supabase session cookie check with Clerk `auth()`:

```typescript
import { auth } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { timingSafeEqual } from "crypto"

/**
 * Auth guard for API routes.
 * Check 1: Shared secret (for webhooks/server-to-server calls)
 * Check 2: Clerk session (for authenticated user requests)
 */
export async function authGuard(): Promise<{ userId: string }> {
  // Check 1: Shared secret (for Telnyx webhooks, server-to-server)
  const headerStore = await headers()
  const secret = headerStore.get("x-api-secret")
  if (
    secret &&
    process.env.INTERNAL_API_SECRET &&
    secret.length === process.env.INTERNAL_API_SECRET.length &&
    timingSafeEqual(
      Buffer.from(secret),
      Buffer.from(process.env.INTERNAL_API_SECRET)
    )
  ) {
    return { userId: "system" }
  }

  // Check 2: Clerk session
  const { userId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized")
  }
  return { userId }
}
```

### Step 2: Find all API routes that need updating

```bash
grep -rn 'requireUser\|auth-guard\|auth-server' --include='*.ts' app/api/
```

### Step 3: Update each route

For every route that imports `requireUser`:

```typescript
// BEFORE:
import { requireUser } from "@/lib/supabase/auth-server"
const user = await requireUser()
const agentId = user.id

// AFTER:
import { auth } from "@clerk/nextjs/server"
const { userId } = await auth()
if (!userId) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
const agentId = userId
```

For routes using auth-guard, the guard itself is updated (Step 1), so they just need the import path verified.

### Step 4: Verify no old imports remain

```bash
grep -rn 'requireUser' --include='*.ts' app/api/
grep -rn 'auth-server' --include='*.ts' app/api/
# Both should return zero results
```

### Step 5: Build check

```bash
npx tsc --noEmit
bun run dev
```

---

**Next task:** CK-05
