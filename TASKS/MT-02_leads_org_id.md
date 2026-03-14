# MT-02: Add org_id to leads Table — Dual-Mode RLS

**Priority:** High — this is the core schema change. Child tables (quotes, call_logs, enrichments, custom_field_values) get team visibility for free through their existing join-based RLS.
**Estimate:** 1 hr
**Branch:** `feature/multi-tenant`

---

## 1. Model

Opus. This is the highest-risk migration — the leads table is the linchpin of the data model. Every mistake cascades to child tables.

## 2. Tools Required

- Supabase MCP (preferred) or SQL Editor
- `MULTI_TENANT_AUDIT.md` Sections 2 + 3 (current RLS policies and schema)
- `bunx tsc --noEmit` after any TypeScript changes
- Supabase backup before starting

## 3. Guardrails

- Do NOT add a NOT NULL constraint on org_id — it MUST be nullable
- Do NOT set a default value on org_id — NULL is the default (solo mode)
- Do NOT modify any existing data (no UPDATE to backfill org_id)
- Do NOT touch RLS policies on child tables (quotes, call_logs, enrichments, custom_field_values, lead_notes) — they inherit through leads join
- Do NOT modify the leads column defaults for agent_id (keep `requesting_user_id()`)
- Take a Supabase backup BEFORE running any SQL
- Test with a solo agent JWT (no org) BEFORE testing with org JWT
- The ELSE branch of every CASE/WHEN must be IDENTICAL to today's policy

## 4. Knowledge

The leads table currently has 4 RLS policies, all using `agent_id = requesting_user_id()`:
- SELECT, INSERT, UPDATE, DELETE — all identical pattern.

Five child tables scope through leads via `lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())`:
- `quotes` (SELECT, INSERT)
- `call_logs` (SELECT, INSERT)
- `enrichments` (SELECT, INSERT)
- `custom_field_values` (ALL — just fixed in MT-00)
- `lead_notes` has direct `agent_id`, not join-based

When we add org_id to leads and change the leads RLS to include `org_id = requesting_org_id()`, the child table subqueries automatically pick up team leads. This is why we start with leads only.

**The dual-mode CASE/WHEN pattern:**
```sql
CASE
  WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
  ELSE agent_id = requesting_user_id()
END
```
When JWT has no org_id (solo agent): ELSE branch fires → identical to today.
When JWT has org_id (team member): THEN branch fires → org-scoped visibility.

## 5. Memory

- leads schema: See MULTI_TENANT_AUDIT.md Section 3
- Current RLS: See MULTI_TENANT_AUDIT.md Section 2 — specifically the 4 leads policies
- `requesting_org_id()` was created in MT-01 and returns NULL for solo agents
- agent_id column has default `requesting_user_id()` — this stays unchanged
- Existing leads all have org_id = NULL after this migration (no data changes)

## 6. Success Criteria

- [ ] `leads` table has new `org_id text` column (nullable, no default)
- [ ] Partial index `idx_leads_org_id` exists on `leads(org_id) WHERE org_id IS NOT NULL`
- [ ] 4 new RLS policies replace the 4 old ones on leads
- [ ] **SOLO AGENT TEST:** With no active org, agent can:
  - SELECT their own leads (same results as before migration)
  - INSERT a new lead (org_id = NULL)
  - UPDATE their own lead
  - DELETE their own lead
  - NOT see other agents' leads
- [ ] **TEAM TEST:** With active org, team member can:
  - SELECT all leads with matching org_id
  - INSERT a new lead with org_id set to their org
  - NOT see leads from other orgs
  - NOT see solo agent leads (org_id = NULL, different agent)
- [ ] **CHILD TABLE INHERITANCE:** With active org:
  - `SELECT * FROM quotes WHERE lead_id IN (SELECT id FROM leads WHERE ...)` returns quotes for all team leads
  - Same for call_logs, enrichments, custom_field_values
  - No RLS changes were made to any child table
- [ ] `bunx tsc --noEmit` passes
- [ ] `database.generated.ts` is regenerated (if using Supabase CLI for types)

## 7. Dependencies

- MT-00 completed (RLS inconsistencies fixed)
- MT-01 completed (`requesting_org_id()` function exists and validated)
- Supabase backup taken

## 8. Failure Handling

| Error | Solution |
|-------|----------|
| Solo agent can't see their leads after migration | The CASE/WHEN ELSE branch is wrong. Restore from backup. The ELSE must be exactly `agent_id = requesting_user_id()`. |
| Column already exists | `ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id text;` |
| Child table queries fail | The leads subquery is the issue, not the child table. Check the leads SELECT policy first. |
| INSERT fails with "new row violates RLS" | The WITH CHECK on INSERT is too restrictive. Ensure it allows `org_id IS NULL` for solo agents. |
| Performance regression on leads queries | The partial index `WHERE org_id IS NOT NULL` handles team queries. Solo queries still use the existing `agent_id` index. Verify both indexes exist. |

## 9. Learning

- Record the exact CASE/WHEN SQL that worked — this pattern is reused in MT-03 for 7 more tables.
- Note whether the INSERT WITH CHECK needed special handling for the NULL/non-NULL org_id cases.
- If child table inheritance didn't work automatically, document why and what additional changes were needed.

---

## SQL to Execute

```sql
-- STEP 0: BACKUP FIRST (Supabase Dashboard → Database → Backups)

-- STEP 1: Add column
ALTER TABLE leads ADD COLUMN IF NOT EXISTS org_id text;

-- STEP 2: Add partial index for team queries
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON leads(org_id) WHERE org_id IS NOT NULL;

-- STEP 3: Drop old policies
DROP POLICY IF EXISTS "Agents can view own leads" ON leads;
DROP POLICY IF EXISTS "Agents can create own leads" ON leads;
DROP POLICY IF EXISTS "Agents can update own leads" ON leads;
DROP POLICY IF EXISTS "Agents can delete own leads" ON leads;

-- STEP 4: Create dual-mode policies

-- SELECT: solo agents see own leads; team members see all org leads
CREATE POLICY "leads_select" ON leads FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL
    THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);

-- INSERT: agent_id must match, org_id must match (or both NULL for solo)
CREATE POLICY "leads_insert" ON leads FOR INSERT WITH CHECK (
  agent_id = requesting_user_id()
  AND (
    (requesting_org_id() IS NOT NULL AND org_id = requesting_org_id())
    OR (requesting_org_id() IS NULL AND org_id IS NULL)
  )
);

-- UPDATE: solo agents update own; team members update own within org
-- (Phase 1: agents can only update their own leads, even in team mode)
-- (Owner-can-update-any is handled in MT-07 via application logic or refined policy)
CREATE POLICY "leads_update" ON leads FOR UPDATE USING (
  agent_id = requesting_user_id()
  AND (
    CASE
      WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
      ELSE org_id IS NULL
    END
  )
);

-- DELETE: same as UPDATE — own leads only
CREATE POLICY "leads_delete" ON leads FOR DELETE USING (
  agent_id = requesting_user_id()
  AND (
    CASE
      WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
      ELSE org_id IS NULL
    END
  )
);

-- STEP 5: Verify
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY policyname;

-- STEP 6: Test solo agent (run with a JWT that has NO org_id)
-- Should return the same leads as before migration
-- INSERT a test lead — org_id should be NULL
-- DELETE the test lead
```

## TypeScript Changes

After the migration, regenerate types:
```bash
bunx supabase gen types typescript --project-id orrppddoiumpwdqbavip > lib/types/database.generated.ts
```

The `leads` type will now include `org_id: string | null`. No other TypeScript changes needed in this task — the application code doesn't reference org_id yet (that's MT-04).
