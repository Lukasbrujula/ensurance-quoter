# MT-01: Validate Clerk Org JWT Claim & Create requesting_org_id()

**Priority:** Critical gate — nothing else proceeds until this validates
**Estimate:** 45 min
**Branch:** `feature/multi-tenant`

---

## 1. Model

Opus for the validation logic and Clerk configuration. Sonnet for the SQL function creation.

## 2. Tools Required

- Clerk Dashboard (manual — configure Organizations and JWT template)
- Supabase MCP or SQL Editor (create Postgres function)
- A test API route to inspect JWT claims (temporary, delete after validation)
- `MULTI_TENANT_AUDIT.md` Section 1 (Auth pattern) and Section 2 (requesting_user_id function)

## 3. Guardrails

- Do NOT modify `requesting_user_id()` — it must continue working exactly as is
- Do NOT modify `middleware.ts`
- Do NOT modify `lib/supabase/clerk-client.ts` or `clerk-client-browser.ts`
- Do NOT modify any existing RLS policies
- Do NOT create any organizations for real users — test org only
- Do NOT enable Organizations in Clerk if it would affect the existing auth flow for solo users
- The test API route created for validation must be deleted before merging

## 4. Knowledge

Clerk Organizations is a feature that adds `orgId`, `orgRole`, and `orgSlug` to the Clerk session. When a user activates an org context, these values appear in the `auth()` response server-side and in the `useAuth()` hook client-side.

**The critical question:** Does `orgId` also appear in the JWT that Supabase receives? The current Clerk-Supabase integration uses `getToken()` with no arguments (per memory: "use getToken() with no params, not JWT template variant"). The JWT's `sub` claim maps to `requesting_user_id()`. We need `org_id` (or `orgId`) to also be present in these JWT claims.

Clerk's JWT templates allow custom claims. If `org_id` is not present by default, we configure the Supabase JWT template in Clerk Dashboard to include `"org_id": "{{org.id}}"`. This makes it available as `current_setting('request.jwt.claims', true)::json->>'org_id'` in Supabase.

**Key constraint:** When a user has NO active organization (solo agent), `org.id` in the JWT template resolves to null/empty string. The `requesting_org_id()` function handles this via `NULLIF(..., '')` — same pattern as `requesting_user_id()`.

## 5. Memory

- Clerk JWT integration uses `getToken()` with no arguments — confirmed in MULTI_TENANT_AUDIT.md Section 1
- `requesting_user_id()` reads `->>'sub'` from `request.jwt.claims` — exact source in MULTI_TENANT_AUDIT.md Section 2
- Clerk domain: `easy-rabbit-71.clerk.accounts.dev`
- Supabase project ID: `orrppddoiumpwdqbavip`

## 6. Success Criteria

- [ ] Clerk Organizations feature is enabled in Clerk Dashboard
- [ ] A test organization exists in Clerk (name: "Test Agency", for validation only)
- [ ] Your test user is a member of the test organization
- [ ] The Clerk JWT template for Supabase includes `org_id` in claims
- [ ] A temporary test API route (`/api/test-jwt`) confirms:
  - When user has active org: `requesting_org_id()` returns the org ID string
  - When user has no active org: `requesting_org_id()` returns NULL
  - In both cases: `requesting_user_id()` continues to return the Clerk user ID (unchanged)
- [ ] `requesting_org_id()` function exists in Supabase and returns `text`
- [ ] The test API route is deleted before merging
- [ ] `bunx tsc --noEmit` passes
- [ ] Existing production auth flow is unaffected (test by logging in with no org context)

## 7. Dependencies

- MT-00 completed (RLS inconsistencies fixed)
- Clerk Dashboard access
- Supabase Dashboard or MCP access
- `MULTI_TENANT_AUDIT.md` for current `requesting_user_id()` definition

## 8. Failure Handling

| Error | Solution |
|-------|----------|
| `org_id` not in JWT claims | Configure Clerk JWT template: Dashboard → JWT Templates → edit the Supabase template → add `"org_id": "{{org.id}}"` to custom claims |
| `requesting_org_id()` returns empty string instead of NULL | The `NULLIF(..., '')` handles this. If it still returns empty string, check if Clerk sends `""` vs `null` — may need `NULLIF(NULLIF(..., ''), 'null')` |
| Enabling Organizations breaks existing login | Clerk Organizations is opt-in per user. Solo users without an org continue to have `orgId = null` in their session. No auth flow change. |
| `getToken()` doesn't include org claims | May need to switch to `getToken({ template: 'supabase' })` if a custom JWT template is used. Check Clerk docs for org claim propagation. |
| Test user can't activate org context | Use Clerk's `<OrganizationSwitcher />` component temporarily, or set active org via Clerk Backend API |

## 9. Learning

- Document which JWT template field name Clerk uses (`org_id` vs `orgId` vs `org_id`) — this is the single most important detail for all subsequent tasks.
- Document whether `getToken()` needed any parameter changes or if the default token includes org claims automatically.
- If the JWT template approach is used, save the exact template JSON for reference.

---

## Manual Steps (Clerk Dashboard)

1. **Enable Organizations:** Clerk Dashboard → Organizations → Enable
2. **Create test org:** Organizations → Create → name "Test Agency"
3. **Add yourself:** Click into the org → Members → Add your test user as Admin
4. **Configure JWT template:** JWT Templates → Find or create the Supabase template → Add custom claim:
   ```json
   {
     "org_id": "{{org.id}}"
   }
   ```
5. **Verify:** The template should now include `sub` (user ID) and `org_id` (org ID or null)

## SQL to Execute

```sql
-- Create requesting_org_id() — mirrors requesting_user_id() exactly
CREATE OR REPLACE FUNCTION public.requesting_org_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'org_id',
    ''
  )::text;
$$;

-- Verify both functions exist and work
SELECT
  requesting_user_id() AS user_id,
  requesting_org_id() AS org_id;
-- Expected: user_id = your Clerk ID, org_id = NULL (or org ID if active org context)
```

## Temporary Test Route

Create `app/api/test-jwt/route.ts` (DELETE AFTER VALIDATION):

```typescript
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"

export async function GET() {
  const { userId, orgId, orgRole } = await auth()

  // Also check what Supabase sees
  const supabase = await createClerkSupabaseClient()
  const { data } = await supabase.rpc('requesting_user_id')
  const { data: orgData } = await supabase.rpc('requesting_org_id')

  return NextResponse.json({
    clerk: { userId, orgId, orgRole },
    supabase: { requesting_user_id: data, requesting_org_id: orgData },
  })
}
```

Hit `GET /api/test-jwt` with and without an active org to verify both paths.
