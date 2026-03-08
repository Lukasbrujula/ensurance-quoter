# BG-01: Telnyx Billing Group API Client + DB Migration

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

---

## 1. Model
Sonnet — straightforward API wrapper + SQL migration

## 2. Tools
- Antigravity (Claude Code)
- Supabase SQL Editor (for migration)
- Terminal (`bunx tsc --noEmit`)

## 3. Guardrails
- ❌ Do NOT modify any existing Telnyx files (`ai-service.ts`, `phone-numbers.ts`, etc.)
- ❌ Do NOT use any npm package for Telnyx — use native `fetch` (matches existing pattern)
- ❌ Do NOT add billing group creation logic here — that's BG-02's job
- ❌ Do NOT touch `components/ui/` or `styles/globals.css`
- ✅ DO match the coding patterns in `lib/telnyx/ai-service.ts` for API calls
- ✅ DO match the patterns in `lib/supabase/settings.ts` for database operations

## 4. Knowledge

### Telnyx Billing Groups API
All endpoints use `Authorization: Bearer {TELNYX_API_KEY}` and base URL `https://api.telnyx.com/v2`.

**Create:** `POST /billing_groups`
```json
// Request
{ "name": "Ensurance - Agent Name" }

// Response (200)
{
  "data": {
    "record_type": "billing_group",
    "id": "f5586561-8ff0-4291-a0ac-84fe544797bd",
    "organization_id": "f1486bae-f067-460c-ad43-73a92848f902",
    "name": "Ensurance - Agent Name",
    "created_at": "2019-10-15T10:07:15.527Z",
    "updated_at": "2019-10-15T10:07:15.527Z",
    "deleted_at": null
  }
}
```

**Get:** `GET /billing_groups/{id}` → same response shape

**List:** `GET /billing_groups` → `{ "data": [...] }`

**Update:** `PATCH /billing_groups/{id}` with `{ "name": "new name" }`

**Delete:** `DELETE /billing_groups/{id}`

### Database: `agent_settings` table
Currently has columns (from `lib/types/database.generated.ts` line 144):
- `id`, `user_id` (unique, Clerk user ID string), `default_first_year_percent`, `default_renewal_percent`, `carrier_commissions` (jsonb), plus notification/profile fields.

We're adding `telnyx_billing_group_id` (text, nullable) to this table.

## 5. Memory
- Telnyx API key is already configured as `TELNYX_API_KEY` env var
- Existing Telnyx API calls in `lib/telnyx/ai-service.ts` use `fetch` with `Authorization: Bearer ${process.env.TELNYX_API_KEY}` — follow this exact pattern
- `agent_settings` uses `user_id` as the Clerk user ID (string like `user_2abc123`)
- Service role client in `lib/supabase/server.ts` is used for operations without user session
- Settings CRUD is in `lib/supabase/settings.ts` — functions like `getAgentSettings(userId)` and `upsertAgentSettings(userId, data)`

## 6. Success Criteria
- [ ] `lib/telnyx/billing.ts` exists with `createBillingGroup()`, `getBillingGroup()`, `deleteBillingGroup()` functions
- [ ] Each function is typed with explicit return types
- [ ] Error handling: non-2xx responses throw with status code and Telnyx error message
- [ ] SQL migration adds `telnyx_billing_group_id TEXT` column to `agent_settings`
- [ ] `lib/supabase/settings.ts` is updated to include `telnyx_billing_group_id` in reads/writes
- [ ] `bunx tsc --noEmit` passes clean
- [ ] No runtime test needed yet — BG-02 will exercise these functions

## 7. Dependencies

**Files to read first (understand patterns):**
```bash
cat lib/telnyx/ai-service.ts    # Telnyx API call pattern
cat lib/telnyx/phone-numbers.ts # Another Telnyx API pattern
cat lib/supabase/settings.ts    # agent_settings CRUD
cat lib/supabase/server.ts      # Service role client
cat lib/types/database.generated.ts | grep -A 30 "agent_settings"  # Current schema
```

**Files to create:**
- `lib/telnyx/billing.ts`

**Files to modify:**
- `lib/supabase/settings.ts` — add `telnyx_billing_group_id` to read/write operations

**SQL to run manually (Lukas in Supabase SQL Editor):**
```sql
ALTER TABLE public.agent_settings
  ADD COLUMN IF NOT EXISTS telnyx_billing_group_id TEXT;
```

**After SQL migration, regenerate types:**
```bash
bunx supabase gen types typescript --project-id <project-id> > lib/types/database.generated.ts
```
Or manually add the field to the generated types if CLI isn't configured.

## 8. Failure Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `TELNYX_API_KEY is undefined` | Missing env var | Check `.env.local` has `TELNYX_API_KEY` |
| Telnyx returns 401 | Invalid API key | Verify key in Telnyx portal → Auth → API Keys |
| Telnyx returns 422 | Invalid request body | Check `name` field is a non-empty string |
| TypeScript error on `telnyx_billing_group_id` | Column not in generated types | Manually add the field to `database.generated.ts` or re-run type generation |
| `agent_settings` upsert fails | Column doesn't exist yet | Run the SQL migration first |

## 9. Learning
- Telnyx billing group IDs are UUIDs (stored as text in our DB)
- The billing group is just a label — it doesn't cost anything to create
- Billing groups can only be assigned to Numbers and Outbound Profiles, not directly to AI assistants. AI assistant costs flow through the number the assistant is assigned to.
- If this task reveals that `lib/telnyx/ai-service.ts` uses a different auth pattern than expected, document it for BG-02

---

## On Completion
- Commit: `feat: add Telnyx billing group API client and DB migration`
- Tell Lukas to run the SQL migration in Supabase SQL Editor
- Proceed to BG-02
