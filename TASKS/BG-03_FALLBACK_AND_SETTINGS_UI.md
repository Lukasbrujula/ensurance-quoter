# BG-03: Fallback Billing Group Creation + Settings UI

## Status
- [x] Complete

---

## 1. Model
Sonnet — API route + UI card component

## 2. Tools
- Claude Code
- Terminal (`bunx tsc --noEmit`)

## 3. Guardrails
- ❌ Do NOT modify `components/ui/` or `styles/globals.css`
- ❌ Do NOT modify the Clerk webhook (BG-02) — this is an independent fallback
- ✅ DO match the card pattern from `google-calendar-card.tsx`
- ✅ DO use `requireAuth` + `auth()` for API route auth (standard pattern)
- ✅ DO use existing `getBillingGroupId` / `setBillingGroupId` from settings.ts

## 4. Knowledge

### Fallback Strategy
The Clerk webhook (BG-02) creates billing groups on `user.created`. But if Telnyx is down or the webhook fails, the agent has no billing group. BG-03 adds a **fallback**: when the agent visits Settings → Integrations, the billing group API route checks if one exists. If not, it creates one on the spot.

### Flow
```
GET /api/settings/billing-group
  ├── Has billing group ID in DB?
  │   ├── Yes → Verify on Telnyx → Return "active"
  │   └── No (or Telnyx 404) → Create new billing group
  │       ├── Success → Store ID, return "active"
  │       └── Failure → Return "not_configured"
  └── UI shows status badge + retry button if failed
```

## 5. Memory
- `getBillingGroupId(userId)` and `setBillingGroupId(userId, id)` exist in `lib/supabase/settings.ts`
- `createBillingGroup(name)` and `getBillingGroup(id)` exist in `lib/telnyx/billing.ts`
- Integrations page uses card pattern: icon box + title + description + badge + optional content
- `currentUser()` from Clerk provides firstName, lastName, emailAddresses for display name

## 6. Success Criteria
- [x] `app/api/settings/billing-group/route.ts` exists — GET returns billing group status
- [x] Fallback creation: if no billing group stored, creates one via Telnyx API
- [x] Handles Telnyx errors gracefully — returns `not_configured` status, never throws to client
- [x] `components/settings/billing-group-card.tsx` exists — shows Active/Not Provisioned badge
- [x] Card appears on integrations page between Google Calendar and Coming Soon cards
- [x] Retry button allows manual re-provisioning if initial fallback failed
- [x] `bunx tsc --noEmit` passes clean

## 7. Dependencies

**Pre-requisites:**
- BG-01 complete (billing.ts exists, DB column exists)
- BG-02 complete (Clerk webhook works)

**Files created:**
- `app/api/settings/billing-group/route.ts`
- `components/settings/billing-group-card.tsx`

**Files modified:**
- `components/settings/integrations-settings-client.tsx` — import + render BillingGroupCard

## 8. Failure Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Telnyx API error on fallback creation | API key issue or Telnyx outage | Card shows "Not Provisioned" with retry button |
| Billing group deleted on Telnyx | Manual deletion in Telnyx portal | GET route detects 404, re-creates automatically |
| `currentUser()` returns null | Edge case — session exists but user fetch fails | Falls back to userId as display name |

## 9. Learning
- The fallback pattern (check-then-create) is idempotent — safe to call multiple times
- `currentUser()` is distinct from `auth()` — provides full user profile including name/email
- The billing group card follows the same pattern as GoogleCalendarCard: loading skeleton → status badge → conditional content
