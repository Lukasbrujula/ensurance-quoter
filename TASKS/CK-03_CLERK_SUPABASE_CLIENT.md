# CK-03: Create Clerk-Aware Supabase Client

**Priority:** Critical — bridge between Clerk auth and Supabase data
**Estimate:** 25 min
**Model:** Sonnet

---

## 1. Tools

- Codebase with CK-01 and CK-02 complete
- `@clerk/nextjs` installed (from CK-01)
- `@supabase/supabase-js` already installed

## 2. Guardrails

- ❌ Do NOT delete `lib/supabase/auth-server.ts` yet — other files still import it (CK-06 swaps imports)
- ❌ Do NOT delete `lib/supabase/auth-client.ts` yet — same reason
- ❌ Do NOT delete `lib/supabase/server.ts` (service role client) — still needed for webhooks/background jobs
- ❌ Do NOT modify any data layer functions yet — CK-06 handles the import swap
- ❌ Do NOT modify API routes yet — CK-04 handles that

## 3. Knowledge

- **The Clerk-Supabase bridge:** Clerk issues JWTs. Supabase verifies them via Clerk's JWKS endpoint (configured in the Supabase Dashboard prereq). You pass the Clerk token as `Authorization: Bearer <token>` on each Supabase request.
- **Native integration (post-April 2025):** No JWT template needed. Supabase verifies Clerk tokens directly via JWKS. Call `getToken()` without a template parameter.
- **Two clients needed:**
  - Server-side: for API routes and server components, using `auth()` from `@clerk/nextjs/server`
  - Browser-side: for client components, using `useSession()` hook
- **The service role client (`lib/supabase/server.ts`) stays untouched.** Webhooks from Telnyx and background jobs have no user session — they need service role.

## 4. Memory

- Current `auth-server.ts` creates Supabase client with cookie-based sessions via `@supabase/ssr`
- Current `auth-client.ts` creates browser Supabase client via `createBrowserClient`
- Service role client in `lib/supabase/server.ts` — KEEP THIS
- The new files are ADDITIONS, not replacements (yet). CK-06 swaps the imports later.

## 5. Success Criteria

1. ✅ `lib/supabase/clerk-client.ts` exists with exported `createClerkSupabaseClient()` function
2. ✅ `lib/supabase/clerk-client-browser.ts` exists with exported `useClerkSupabase()` hook
3. ✅ Both files compile: `npx tsc --noEmit` passes on the new files
4. ✅ `lib/supabase/server.ts` (service role client) is completely untouched
5. ✅ No existing files were modified in this task

## 6. Dependencies

- CK-01 complete (`@clerk/nextjs` installed)
- Clerk Supabase integration activated in both dashboards (Lukas prereq)

**Files to read before starting:**
```bash
cat lib/supabase/auth-server.ts    # Understand current server pattern
cat lib/supabase/auth-client.ts    # Understand current browser pattern
cat lib/supabase/server.ts         # Service role — do NOT modify
ls lib/supabase/                   # See all existing files
```

## 7. Failure Handling

| Error | Cause | Solution |
|-------|-------|---------|
| `getToken()` returns null | User not authenticated or Clerk not configured | For native integration, try `getToken()` without template param. Ensure ClerkProvider wraps app. |
| Supabase returns 401 with Clerk token | Clerk not configured as Supabase third-party provider | Verify Supabase Dashboard → Auth → Third Party has Clerk domain |
| RLS blocks all queries | `requesting_user_id()` function not created yet | Expected — CK-M1 creates it. You can test the client creation compiles, but queries won't work until after CK-M1. |
| Type error on `useSession()` | Wrong import path | Must be `import { useSession } from "@clerk/nextjs"` |
| `Cannot find module @supabase/supabase-js` | Package missing | Should already be installed. Run `bun add @supabase/supabase-js` if needed. |

## 8. Learning

- Document whether `getToken({ template: "supabase" })` or `getToken()` (no template) works with the native integration
- Note the exact Supabase client creation pattern that succeeds
- Log if `useMemo` dependency on `session` causes unnecessary re-renders (may need to memoize differently)

---

## 9. Step-by-Step Instructions

### Step 1: Create server-side Clerk Supabase client

Create `lib/supabase/clerk-client.ts`:

```typescript
import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"

/**
 * Creates a Supabase client authenticated with the current Clerk user's JWT.
 * Use this in API routes, server actions, and server components.
 * RLS policies will scope data to the authenticated user.
 *
 * For webhook handlers or background jobs (no user session),
 * use the service role client from lib/supabase/server.ts instead.
 */
export async function createClerkSupabaseClient() {
  const { getToken } = await auth()

  // Native Clerk-Supabase integration: Supabase verifies via JWKS
  const supabaseToken = await getToken()

  if (!supabaseToken) {
    throw new Error("No Clerk session token available")
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseToken}`,
        },
      },
    }
  )
}
```

### Step 2: Create browser-side Clerk Supabase client

Create `lib/supabase/clerk-client-browser.ts`:

```typescript
"use client"

import { createClient } from "@supabase/supabase-js"
import { useSession } from "@clerk/nextjs"
import { useMemo } from "react"

/**
 * React hook that creates a Supabase client authenticated with the
 * current Clerk session. Use this in client components.
 *
 * Usage:
 *   const supabase = useClerkSupabase()
 *   const { data } = await supabase.from("leads").select("*")
 */
export function useClerkSupabase() {
  const { session } = useSession()

  return useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: async (url, options = {}) => {
            const token = await session?.getToken()
            const headers = new Headers(options?.headers)
            if (token) {
              headers.set("Authorization", `Bearer ${token}`)
            }
            return fetch(url, { ...options, headers })
          },
        },
      }
    )
  }, [session])
}
```

### Step 3: Verify types compile

```bash
npx tsc --noEmit
# New files should compile cleanly
# Existing files may still have warnings from old auth imports — that's expected
```

---

**⚠️ NEXT: Lukas performs CK-M1 (manual SQL migration in Supabase Dashboard) before CK-04 can proceed.**
