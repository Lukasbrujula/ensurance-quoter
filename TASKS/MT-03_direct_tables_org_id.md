# MT-03: Add org_id to Direct-Ownership Tables

**Priority:** High — extends the leads pattern to remaining tables
**Estimate:** 1.5 hrs
**Branch:** `feature/multi-tenant`

---

## 1. Model

Sonnet. This is the same pattern from MT-02 applied to 7 tables — mechanical repetition, no new architecture decisions.

## 2. Tools Required

- Supabase MCP or SQL Editor
- `MULTI_TENANT_AUDIT.md` Sections 2 + 3
- MT-02 as reference for the dual-mode RLS pattern that worked
- Supabase backup before starting

## 3. Guardrails

- Do NOT modify tables that stay personal: `agent_settings`, `agent_licenses`, `google_integrations`, `agent_business_profile`
- Do NOT touch child tables that inherit through leads: `quotes`, `call_logs`, `enrichments`, `custom_field_values`
- Do NOT add NOT NULL constraints on org_id
- Do NOT modify existing data
- Use the EXACT same CASE/WHEN pattern that was validated in MT-02
- Take Supabase backup before starting
- Test each table individually — don't batch all 7 and hope for the best

## 4. Knowledge

Seven tables have direct `agent_id` columns and their own RLS policies (not join-based through leads). Each needs `org_id text` added and dual-mode RLS policies, following the exact pattern from MT-02.

**Tables and their current policies (from MULTI_TENANT_AUDIT.md Section 2):**

| Table | Current Policies | Policy Pattern |
|-------|-----------------|----------------|
| `sms_logs` | SELECT, INSERT — `agent_id = requesting_user_id()` | Direct |
| `activity_logs` | SELECT, INSERT — `agent_id = requesting_user_id()` | Direct |
| `lead_notes` | SELECT, INSERT, DELETE — `agent_id = requesting_user_id()` | Direct |
| `ai_agents` | ALL — `agent_id = requesting_user_id()` | Direct |
| `ai_agent_calls` | SELECT, INSERT, UPDATE — `agent_id = requesting_user_id()` | Direct |
| `ai_transcripts` | SELECT — `agent_id = requesting_user_id()`, INSERT — `true` (service role) | Mixed |
| `agent_phone_numbers` | SELECT, INSERT, UPDATE, DELETE — `agent_id = requesting_user_id()` | Direct |

**Special case: `ai_transcripts`** has an INSERT policy of `true` (allowing any insert) because transcripts are inserted by the Telnyx webhook handler using the service role client. The SELECT policy uses `agent_id`. For multi-tenant, only the SELECT policy needs the dual-mode pattern. Leave the INSERT policy as `true`.

**Special case: `custom_field_definitions`** — this becomes org-scoped in team mode. When an org exists, the whole team shares field definitions. The CASE/WHEN switches from `agent_id` to `org_id` for SELECT, but INSERT/UPDATE/DELETE should check both `agent_id` (must be an admin/owner) AND `org_id`. For Phase 1 simplicity, any org member can manage definitions — restrict to owner role in Phase 2 via application logic.

## 5. Memory

- The dual-mode CASE/WHEN pattern from MT-02 is the template. Copy it exactly.
- `requesting_org_id()` returns NULL for solo agents — validated in MT-01.
- `sms_logs.is_read` has a partial index `(agent_id, is_read) WHERE is_read = false` — adding org_id doesn't affect this index, but consider adding a team partial index.

## 6. Success Criteria

For EACH of the 7 tables:
- [ ] `org_id text` column exists (nullable, no default)
- [ ] Partial index on `(org_id) WHERE org_id IS NOT NULL` exists
- [ ] Old RLS policies are dropped, new dual-mode policies are created
- [ ] Solo agent can still CRUD their own data (identical to pre-migration)
- [ ] Team member can see org-wide data in SELECT
- [ ] Team member can only INSERT with their own agent_id + matching org_id

Additionally:
- [ ] `custom_field_definitions` uses org_id scope in team mode (whole team shares definitions)
- [ ] `ai_transcripts` INSERT policy remains `true` (service role webhook inserts)
- [ ] `bunx tsc --noEmit` passes
- [ ] Regenerate `database.generated.ts` with new columns

## 7. Dependencies

- MT-02 completed and validated (the leads pattern is the template)
- Supabase backup taken

## 8. Failure Handling

| Error | Solution |
|-------|----------|
| Policy on table X locks out solo agent | Drop the new policies, recreate old ones from MULTI_TENANT_AUDIT.md Section 2. Debug the CASE/WHEN for that specific table. |
| Telnyx webhook can't insert transcripts | The ai_transcripts INSERT policy must stay `true`. If it was accidentally changed, restore it. |
| SMS send fails after migration | Check sms_logs INSERT policy — the sendSms function passes `agentId: userId`, so the INSERT WITH CHECK must allow `agent_id = requesting_user_id()`. |

## 9. Learning

- If any table's policy pattern needed deviation from the MT-02 template, document why.
- Record the total number of policies changed for the commit message.
- Note any indexes that should be added for team query performance.

---

## SQL to Execute

Execute one table at a time. Verify after each before proceeding.

```sql
-- BACKUP FIRST

-- ============================================================
-- TABLE 1: sms_logs
-- ============================================================
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_sms_logs_org_id ON sms_logs(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Agents see own SMS" ON sms_logs;
DROP POLICY IF EXISTS "Agents send SMS" ON sms_logs;

CREATE POLICY "sms_logs_select" ON sms_logs FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);
CREATE POLICY "sms_logs_insert" ON sms_logs FOR INSERT WITH CHECK (
  agent_id = requesting_user_id()
  AND (
    (requesting_org_id() IS NOT NULL AND org_id = requesting_org_id())
    OR (requesting_org_id() IS NULL AND org_id IS NULL)
  )
);

-- ============================================================
-- TABLE 2: activity_logs
-- ============================================================
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can insert activities for their leads" ON activity_logs;
DROP POLICY IF EXISTS "Users can view activities for their leads" ON activity_logs;

CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT WITH CHECK (
  agent_id = requesting_user_id()
  AND (
    (requesting_org_id() IS NOT NULL AND org_id = requesting_org_id())
    OR (requesting_org_id() IS NULL AND org_id IS NULL)
  )
);

-- ============================================================
-- TABLE 3: lead_notes
-- ============================================================
ALTER TABLE lead_notes ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_lead_notes_org_id ON lead_notes(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Agents can view notes for their leads" ON lead_notes;
DROP POLICY IF EXISTS "Agents can insert notes for their leads" ON lead_notes;
DROP POLICY IF EXISTS "Agents can delete their own notes" ON lead_notes;

CREATE POLICY "lead_notes_select" ON lead_notes FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);
CREATE POLICY "lead_notes_insert" ON lead_notes FOR INSERT WITH CHECK (
  agent_id = requesting_user_id()
  AND (
    (requesting_org_id() IS NOT NULL AND org_id = requesting_org_id())
    OR (requesting_org_id() IS NULL AND org_id IS NULL)
  )
);
CREATE POLICY "lead_notes_delete" ON lead_notes FOR DELETE USING (
  agent_id = requesting_user_id()
);

-- ============================================================
-- TABLE 4: ai_agents
-- ============================================================
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_ai_agents_org_id ON ai_agents(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can manage their own agents" ON ai_agents;

CREATE POLICY "ai_agents_select" ON ai_agents FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);
CREATE POLICY "ai_agents_insert" ON ai_agents FOR INSERT WITH CHECK (
  agent_id = requesting_user_id()
  AND (
    (requesting_org_id() IS NOT NULL AND org_id = requesting_org_id())
    OR (requesting_org_id() IS NULL AND org_id IS NULL)
  )
);
CREATE POLICY "ai_agents_update" ON ai_agents FOR UPDATE USING (
  agent_id = requesting_user_id()
);
CREATE POLICY "ai_agents_delete" ON ai_agents FOR DELETE USING (
  agent_id = requesting_user_id()
);

-- ============================================================
-- TABLE 5: ai_agent_calls
-- ============================================================
ALTER TABLE ai_agent_calls ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_ai_agent_calls_org_id ON ai_agent_calls(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view their AI calls" ON ai_agent_calls;
DROP POLICY IF EXISTS "Agents can insert their AI calls" ON ai_agent_calls;
DROP POLICY IF EXISTS "Agents can update their AI calls" ON ai_agent_calls;

CREATE POLICY "ai_agent_calls_select" ON ai_agent_calls FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);
CREATE POLICY "ai_agent_calls_insert" ON ai_agent_calls FOR INSERT WITH CHECK (
  agent_id = requesting_user_id()
  AND (
    (requesting_org_id() IS NOT NULL AND org_id = requesting_org_id())
    OR (requesting_org_id() IS NULL AND org_id IS NULL)
  )
);
CREATE POLICY "ai_agent_calls_update" ON ai_agent_calls FOR UPDATE USING (
  agent_id = requesting_user_id()
);

-- ============================================================
-- TABLE 6: ai_transcripts
-- ============================================================
ALTER TABLE ai_transcripts ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_ai_transcripts_org_id ON ai_transcripts(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view their own transcripts" ON ai_transcripts;
-- NOTE: Keep "Service role can insert transcripts" (INSERT true) — DO NOT DROP

CREATE POLICY "ai_transcripts_select" ON ai_transcripts FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);

-- ============================================================
-- TABLE 7: agent_phone_numbers
-- ============================================================
ALTER TABLE agent_phone_numbers ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_agent_phone_numbers_org_id ON agent_phone_numbers(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view own phone numbers" ON agent_phone_numbers;
DROP POLICY IF EXISTS "Users can insert own phone numbers" ON agent_phone_numbers;
DROP POLICY IF EXISTS "Users can update own phone numbers" ON agent_phone_numbers;
DROP POLICY IF EXISTS "Users can delete own phone numbers" ON agent_phone_numbers;

CREATE POLICY "agent_phone_numbers_select" ON agent_phone_numbers FOR SELECT USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
);
CREATE POLICY "agent_phone_numbers_insert" ON agent_phone_numbers FOR INSERT WITH CHECK (
  agent_id = requesting_user_id()
  AND (
    (requesting_org_id() IS NOT NULL AND org_id = requesting_org_id())
    OR (requesting_org_id() IS NULL AND org_id IS NULL)
  )
);
CREATE POLICY "agent_phone_numbers_update" ON agent_phone_numbers FOR UPDATE USING (
  agent_id = requesting_user_id()
);
CREATE POLICY "agent_phone_numbers_delete" ON agent_phone_numbers FOR DELETE USING (
  agent_id = requesting_user_id()
);

-- ============================================================
-- TABLE 8: custom_field_definitions (SPECIAL: org-scoped in team mode)
-- ============================================================
ALTER TABLE custom_field_definitions ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_org_id ON custom_field_definitions(org_id) WHERE org_id IS NOT NULL;

DROP POLICY IF EXISTS "Agents manage own field definitions" ON custom_field_definitions;

CREATE POLICY "custom_field_definitions_all" ON custom_field_definitions FOR ALL USING (
  CASE
    WHEN requesting_org_id() IS NOT NULL THEN org_id = requesting_org_id()
    ELSE agent_id = requesting_user_id()
  END
) WITH CHECK (
  CASE
    WHEN requesting_org_id() IS NOT NULL
    THEN org_id = requesting_org_id() AND agent_id = requesting_user_id()
    ELSE agent_id = requesting_user_id() AND org_id IS NULL
  END
);

-- ============================================================
-- VERIFY ALL
-- ============================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('sms_logs', 'activity_logs', 'lead_notes', 'ai_agents', 'ai_agent_calls', 'ai_transcripts', 'agent_phone_numbers', 'custom_field_definitions')
ORDER BY tablename, policyname;
```

## Post-Migration

```bash
# Regenerate TypeScript types
bunx supabase gen types typescript --project-id orrppddoiumpwdqbavip > lib/types/database.generated.ts

# Type check
bunx tsc --noEmit
```
