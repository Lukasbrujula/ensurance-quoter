# MT-00: Fix Existing RLS Inconsistencies

**Priority:** High — these are bugs independent of multi-tenancy
**Estimate:** 30 min
**Branch:** `feature/lukas` (this is standalone, merge before MT-01)

---

## 1. Model

Sonnet. This is mechanical SQL replacement — no architecture decisions.

## 2. Tools Required

- Supabase MCP (preferred) or Supabase SQL Editor
- `bunx tsc --noEmit` for type check after
- `MULTI_TENANT_AUDIT.md` Section 2 (RLS Policies) as reference

## 3. Guardrails

- Do NOT change the behavior of any policy — only change which identity function it calls
- Do NOT touch any table schema (no column changes)
- Do NOT modify any TypeScript files
- Do NOT touch RLS policies on tables other than the 3 listed below
- After each policy change, verify a solo agent can still CRUD their own data
- Take a Supabase backup before starting

## 4. Knowledge

Three RLS policies use the wrong identity function. The entire codebase uses Clerk for auth, which puts the user ID in the JWT `sub` claim. The function `requesting_user_id()` reads this correctly. But three tables were created before the Clerk migration was complete, or during it, and still reference Supabase Auth functions:

- `custom_field_definitions` — uses `auth.uid()` which returns a Supabase Auth UUID. Clerk users don't have Supabase Auth UUIDs. This policy effectively blocks all access.
- `custom_field_values` — same issue, also joins through leads using `auth.uid()`
- `email_logs` — uses `auth.jwt() ->> 'sub'` directly instead of the `requesting_user_id()` wrapper function

These may appear to work in testing because the service role client bypasses RLS, but they are broken under normal RLS enforcement.

## 5. Memory

- `requesting_user_id()` is defined in `MULTI_TENANT_AUDIT.md` Section 2. It reads `current_setting('request.jwt.claims', true)::json->>'sub'` and returns text.
- `auth.uid()` returns a UUID from Supabase Auth — which Clerk users don't have.
- The `agent_business_profile` migration file (`20260305_create_agent_business_profile.sql`) also defined `agent_id` as `uuid` referencing `auth.users(id)`, but the live column is `text`. Document this drift but do not attempt to fix the migration file — it's already been applied.

## 6. Success Criteria

- [ ] `custom_field_definitions` ALL policy uses `agent_id = requesting_user_id()` (not `auth.uid()`)
- [ ] `custom_field_values` ALL policy uses `lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())` (not `auth.uid()`)
- [ ] `email_logs` ALL policy uses `agent_id = requesting_user_id()` (not `auth.jwt() ->> 'sub'`)
- [ ] Run `SELECT policyname, qual FROM pg_policies WHERE tablename IN ('custom_field_definitions', 'custom_field_values', 'email_logs')` and confirm no references to `auth.uid()` or `auth.jwt()`
- [ ] Existing solo agent can still create, read, update, delete custom field definitions
- [ ] Existing solo agent can still read/write custom field values on their leads
- [ ] Existing solo agent can still read their email logs
- [ ] `bunx tsc --noEmit` passes (no TypeScript changes, but verify nothing broke)

## 7. Dependencies

- `MULTI_TENANT_AUDIT.md` — Section 2 for current policy definitions
- Supabase project access (MCP or Dashboard)
- No code file dependencies — this is SQL only

## 8. Failure Handling

| Error | Solution |
|-------|----------|
| `requesting_user_id()` returns NULL | The Clerk JWT isn't being passed. Check that the API route uses `createClerkSupabaseClient()` not `createServiceRoleClient()`. |
| Policy change locks all users out | Restore from Supabase backup taken at start of task. The old policies (even broken ones) at least work via service role fallback. |
| `pg_policies` still shows `auth.uid()` after DROP/CREATE | Policies may be cached. Run `SELECT pg_reload_conf()` or reconnect. |

## 9. Learning

- Document in a comment on the migration file: "MT-00 fixed RLS policies to use requesting_user_id() instead of auth.uid(). The original migration referenced Supabase Auth which is no longer the auth provider."
- If any other tables are found using `auth.uid()` during this fix, list them for MT-01 to address.

---

## SQL to Execute

```sql
-- BACKUP FIRST: Supabase Dashboard → Database → Backups

-- 1. Fix custom_field_definitions
DROP POLICY IF EXISTS "Agents manage own field definitions" ON custom_field_definitions;
CREATE POLICY "Agents manage own field definitions" ON custom_field_definitions
  FOR ALL USING (agent_id = requesting_user_id())
  WITH CHECK (agent_id = requesting_user_id());

-- 2. Fix custom_field_values
DROP POLICY IF EXISTS "Agents manage own lead field values" ON custom_field_values;
CREATE POLICY "Agents manage own lead field values" ON custom_field_values
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id()))
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id()));

-- 3. Fix email_logs
DROP POLICY IF EXISTS "Agents see own emails" ON email_logs;
CREATE POLICY "Agents see own emails" ON email_logs
  FOR ALL USING (agent_id = requesting_user_id())
  WITH CHECK (agent_id = requesting_user_id());

-- 4. Verify
SELECT tablename, policyname, qual
FROM pg_policies
WHERE tablename IN ('custom_field_definitions', 'custom_field_values', 'email_logs');
```
