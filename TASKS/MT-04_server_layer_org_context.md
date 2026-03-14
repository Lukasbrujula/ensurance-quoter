# MT-04: Update Server Layer for Org Context

**Priority:** High — connects DB changes to application code
**Estimate:** 2-3 hrs (widest-reaching code change)
**Branch:** `feature/multi-tenant`

---

## 1. Model

Opus. This task touches the auth helper, server actions, and API routes — the three core patterns that every page depends on. Precision matters.

## 2. Tools Required

- Full codebase access (all files in `lib/actions/`, `lib/supabase/`, `app/api/`)
- `MULTI_TENANT_AUDIT.md` Sections 1 + 4 (auth pattern + representative API routes)
- `bunx tsc --noEmit` after every file change
- `bun run build` at end to verify no runtime issues

## 3. Guardrails

- Do NOT change the behavior of any function when `orgId` is null — every path must be identical to today
- Do NOT modify Telnyx webhook handlers (`app/api/agents/call-complete`, `app/api/agents/intake-webhook`, `app/api/webhooks/sms`) — these use service role client and have no user session
- Do NOT modify the Clerk webhook handler (`app/api/webhooks/clerk`) — it uses service role client
- Do NOT modify `lib/supabase/clerk-client.ts` or `clerk-client-browser.ts` — the JWT already carries org_id from MT-01
- Do NOT add org_id to any Zustand store in this task (that's MT-05)
- Do NOT change any UI component in this task
- All changes must be backward-compatible: `orgId: null` = today's behavior

## 4. Knowledge

**The auth helper (`requireClerkUser`)** currently returns `{ id: string }`. It needs to return `{ id: string; orgId: string | null; orgRole: string | null }`. Since `auth()` from Clerk already provides `orgId` and `orgRole`, this is a one-line addition. Every caller destructures `user.id` — adding `orgId` and `orgRole` to the return value doesn't break any existing destructuring.

**Server actions** (`lib/actions/leads.ts` is the primary one) call `requireUser()` then pass `user.id` to DB functions. For inserts, they now also pass `user.orgId`. For reads, they accept an optional `scope` parameter.

**API routes** follow the pattern: `const { userId } = await auth()`. They now also extract `orgId`: `const { userId, orgId } = await auth()`. For routes that read data, they check for a `scope` query parameter and pass the appropriate filter to the DB function.

**DB functions** (`lib/supabase/leads.ts`, `lib/supabase/dashboard.ts`, etc.) currently accept `agentId: string` as their filter. For team mode, they need a variant that filters by `orgId` instead. The simplest approach: add an optional `orgId` parameter. When present, query with `org_id = orgId` instead of `agent_id = agentId`.

**Critical: RLS is the safety net.** Even if application code passes the wrong filter, RLS blocks unauthorized access. The application code is for convenience (correct queries), not security (that's RLS).

## 5. Memory

- `auth()` from Clerk returns `{ userId, orgId, orgRole, orgSlug, ... }` — confirmed in Clerk docs
- Server actions in `lib/actions/leads.ts` are the mutation gateway (MULTI_TENANT_AUDIT.md Section 4)
- API routes follow the pattern in `app/api/dashboard/stats/route.ts` — `const { userId } = await auth()` (MULTI_TENANT_AUDIT.md Section 4)
- The `has()` function for feature gating also comes from `auth()` — don't disrupt it

## 6. Success Criteria

- [ ] `requireClerkUser()` returns `{ id: string; orgId: string | null; orgRole: string | null }`
- [ ] `fetchLeadsAction()` accepts optional `scope: 'personal' | 'team'` parameter
- [ ] `createLead()` includes `org_id: user.orgId` in the insert data
- [ ] `GET /api/dashboard/stats` accepts `?scope=team` query parameter
- [ ] `GET /api/inbox/conversations` accepts `?scope=team` query parameter
- [ ] `GET /api/activity-log/history` accepts `?scope=team` query parameter
- [ ] When `scope` is not provided or is `'personal'`, behavior is identical to today
- [ ] When `scope` is `'team'` but user has no orgId, behavior falls back to personal
- [ ] `bunx tsc --noEmit` passes with zero errors
- [ ] `bun run build` succeeds
- [ ] Solo agent (no org) can perform all existing operations without any change

## 7. Dependencies

- MT-02 completed (leads has org_id column)
- MT-03 completed (all direct-ownership tables have org_id)
- `MULTI_TENANT_AUDIT.md` for current patterns

## 8. Failure Handling

| Error | Solution |
|-------|----------|
| TypeScript error: Property 'orgId' does not exist | Make sure `auth()` is imported from `@clerk/nextjs/server`, not an old wrapper. Clerk's auth() includes orgId when Organizations is enabled. |
| Existing tests fail | All changes default to null/personal. If a test doesn't pass `orgId`, it should get `null` and behave identically. |
| Solo agent's lead insert fails | Check that `dbInsertLead` passes `org_id: null` (not `org_id: undefined`). Supabase treats undefined as "don't include" vs null as "set to NULL". |
| Team scope returns empty results | RLS is filtering. Check that the JWT includes org_id (MT-01 validation) and that the leads table has org_id values for test data. |

## 9. Learning

- Count the total number of files modified — document for the commit message.
- If any API route pattern doesn't fit the standard `const { userId, orgId } = await auth()` pattern, document the exception and why.
- Note which DB functions needed the most changes — these are the patterns for Phase 2 features.

---

## Implementation Guide

### Change 1: `lib/supabase/clerk-client.ts`

```typescript
// BEFORE:
export async function requireClerkUser(): Promise<{ id: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return { id: userId }
}

// AFTER:
export async function requireClerkUser(): Promise<{
  id: string
  orgId: string | null
  orgRole: string | null
}> {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return { id: userId, orgId: orgId ?? null, orgRole: orgRole ?? null }
}
```

### Change 2: `lib/actions/leads.ts` — fetchLeads

```typescript
// BEFORE:
export async function fetchLeads(): Promise<ActionResult<Lead[]>> {
  const user = await requireUser()
  const leads = await dbGetLeads(user.id)
  return { success: true, data: leads }
}

// AFTER:
export async function fetchLeads(
  scope: 'personal' | 'team' = 'personal'
): Promise<ActionResult<Lead[]>> {
  const user = await requireUser()
  if (scope === 'team' && user.orgId) {
    const leads = await dbGetLeadsByOrg(user.orgId)
    return { success: true, data: leads }
  }
  const leads = await dbGetLeads(user.id)
  return { success: true, data: leads }
}
```

### Change 3: `lib/actions/leads.ts` — createLead

```typescript
// BEFORE:
const created = await dbInsertLead({ ...parsed.data, agentId: user.id })

// AFTER:
const created = await dbInsertLead({ ...parsed.data, agentId: user.id, orgId: user.orgId })
```

### Change 4: `lib/supabase/leads.ts` — new function

```typescript
// ADD (do not modify existing getLeads):
export async function getLeadsByOrg(orgId: string) {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}
```

### Change 5: Representative API route pattern

Apply this to dashboard/stats, inbox/conversations, activity-log/history, and any other read route that should support team scope:

```typescript
// BEFORE:
const { userId } = await auth()
const stats = await getDashboardStats(userId)

// AFTER:
const { userId, orgId } = await auth()
const url = new URL(request.url)
const scope = url.searchParams.get('scope') ?? 'personal'
const stats = (scope === 'team' && orgId)
  ? await getDashboardStatsByOrg(orgId)
  : await getDashboardStats(userId!)
```

### Files to Modify (complete list)

**Core auth:**
- `lib/supabase/clerk-client.ts` — add orgId/orgRole to return type

**Server actions:**
- `lib/actions/leads.ts` — scope param on reads, orgId on inserts

**Supabase data layer (add new "ByOrg" functions, don't modify existing):**
- `lib/supabase/leads.ts` — add `getLeadsByOrg()`
- `lib/supabase/dashboard.ts` — add `getDashboardStatsByOrg()`
- `lib/supabase/inbox.ts` — add `getConversationPreviewsByOrg()`
- `lib/supabase/sms.ts` — add org-scoped variant if needed
- `lib/supabase/activity-log.ts` — add org-scoped variant

**API routes (add scope query param handling):**
- `app/api/dashboard/stats/route.ts`
- `app/api/inbox/conversations/route.ts`
- `app/api/activity-log/history/route.ts`
- `app/api/notifications/route.ts`

**Routes that need orgId on inserts:**
- `app/api/sms/route.ts` — pass orgId to sendSms
- `app/api/activity-log/route.ts` — pass orgId to logActivity
- `app/api/agents/route.ts` — pass orgId when creating AI agent

**Routes that do NOT change:**
- `app/api/quote/route.ts` — quoting is always personal
- `app/api/assistant/chat/route.ts` — personal AI chat
- `app/api/settings/*` — personal settings (except carriers/custom-fields in future)
- All webhook routes — service role, no user session
- All Telnyx routes — personal telephony
