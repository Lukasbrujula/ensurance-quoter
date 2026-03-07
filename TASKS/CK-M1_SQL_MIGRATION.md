# CK-M1: Supabase SQL Migration (Manual — Lukas)

**Priority:** Critical — RLS won't work without this
**Estimate:** 20 min
**Executor:** Lukas (NOT Claude Code)

---

⚠️ **This is NOT a Claude Code task.** Run these SQL statements in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).

Run each block separately so you can see errors immediately.

---

## 1. Tools

- Supabase Dashboard → SQL Editor
- Web browser

## 2. Guardrails

- ❌ Do NOT drop tables — only alter columns and policies
- ❌ Do NOT delete any data — old test data just won't match new Clerk IDs (that's fine)
- ❌ Do NOT modify the service role bypass — it must still work for webhooks
- ❌ Run each SQL block SEPARATELY — don't paste everything at once

## 3. Knowledge

- Clerk user IDs are strings like `user_2nDKt8XmkFJ`. Supabase's `auth.uid()` returns UUID.
- Since we're replacing Supabase Auth with Clerk, we need:
  - (a) A Postgres function to extract the Clerk ID from JWTs
  - (b) Columns changed from UUID to TEXT
  - (c) RLS policies updated to use the new function instead of `auth.uid()`
- The `requesting_user_id()` function reads the `sub` claim from the JWT, which is where Clerk puts the user ID.

## 4. Memory

- 5 tables with RLS: `leads`, `enrichments`, `quotes`, `call_logs`, `agent_settings`
- `leads` and `agent_settings` have direct user ID columns (`agent_id` and `user_id`)
- `enrichments`, `quotes`, `call_logs` use join-based policies (lead ownership)
- RLS policy names from Phase 4: "Agents can view own leads", "Agents can create own leads", etc.
- Service role client bypasses RLS by design — this stays working

## 5. Success Criteria

1. ✅ `requesting_user_id()` function exists: `SELECT requesting_user_id();` returns NULL (no JWT in SQL Editor — that's correct)
2. ✅ `agent_id` column on `leads` is TEXT type
3. ✅ `user_id` column on `agent_settings` is TEXT type
4. ✅ All old RLS policies dropped
5. ✅ All new RLS policies created with `requesting_user_id()` instead of `auth.uid()`
6. ✅ Default values set on `agent_id` and `user_id` columns

---

## 6. SQL Blocks — Run Each Separately

### Block 1: Create the `requesting_user_id()` function

```sql
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$;
```

**Verify:** `SELECT requesting_user_id();` → should return NULL.

### Block 2: Alter column types

```sql
-- leads table
ALTER TABLE leads ALTER COLUMN agent_id TYPE text;

-- agent_settings table
ALTER TABLE agent_settings ALTER COLUMN user_id TYPE text;
```

**Check if other tables have direct agent_id columns:**
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name IN ('agent_id', 'user_id')
AND table_schema = 'public';
```
If any other tables show UUID for agent_id/user_id, alter those too.

### Block 3: Set defaults for new rows

```sql
ALTER TABLE leads ALTER COLUMN agent_id SET DEFAULT requesting_user_id();
ALTER TABLE agent_settings ALTER COLUMN user_id SET DEFAULT requesting_user_id();
```

### Block 4: Check existing policy names

Before dropping, see what exists:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Copy the output — you need the exact policy names to drop them.

### Block 5: Drop old RLS policies and create new ones

**For `leads` table:**
```sql
-- Drop old (adjust names to match what Block 4 showed)
DROP POLICY IF EXISTS "Agents can view own leads" ON leads;
DROP POLICY IF EXISTS "Agents can create own leads" ON leads;
DROP POLICY IF EXISTS "Agents can update own leads" ON leads;
DROP POLICY IF EXISTS "Agents can delete own leads" ON leads;

-- Create new
CREATE POLICY "Agents can view own leads" ON leads
  FOR SELECT USING (agent_id = requesting_user_id());

CREATE POLICY "Agents can create own leads" ON leads
  FOR INSERT WITH CHECK (agent_id = requesting_user_id());

CREATE POLICY "Agents can update own leads" ON leads
  FOR UPDATE USING (agent_id = requesting_user_id());

CREATE POLICY "Agents can delete own leads" ON leads
  FOR DELETE USING (agent_id = requesting_user_id());
```

**For `agent_settings` table:**
```sql
DROP POLICY IF EXISTS "Users can view own settings" ON agent_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON agent_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON agent_settings;

CREATE POLICY "Users can view own settings" ON agent_settings
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Users can insert own settings" ON agent_settings
  FOR INSERT WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update own settings" ON agent_settings
  FOR UPDATE USING (user_id = requesting_user_id());
```

**For `enrichments`, `quotes`, `call_logs` (join-based):**
```sql
-- enrichments
DROP POLICY IF EXISTS "Agents can view own enrichments" ON enrichments;
DROP POLICY IF EXISTS "Agents can create own enrichments" ON enrichments;

CREATE POLICY "Agents can view own enrichments" ON enrichments
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())
  );

CREATE POLICY "Agents can create own enrichments" ON enrichments
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())
  );

-- quotes
DROP POLICY IF EXISTS "Agents can view own quotes" ON quotes;
DROP POLICY IF EXISTS "Agents can create own quotes" ON quotes;

CREATE POLICY "Agents can view own quotes" ON quotes
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())
  );

CREATE POLICY "Agents can create own quotes" ON quotes
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())
  );

-- call_logs
DROP POLICY IF EXISTS "Agents can view own call_logs" ON call_logs;
DROP POLICY IF EXISTS "Agents can create own call_logs" ON call_logs;

CREATE POLICY "Agents can view own call_logs" ON call_logs
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())
  );

CREATE POLICY "Agents can create own call_logs" ON call_logs
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())
  );
```

### Block 6: Verify everything

```sql
-- Check function exists:
SELECT requesting_user_id(); -- Should return NULL

-- Check all policies:
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
-- Should show new policies with requesting_user_id()

-- Check column types:
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name IN ('agent_id', 'user_id')
AND table_schema = 'public';
-- Should show: text (not uuid)
```

---

**NEXT: Tell Claude Code to proceed with CK-04.**
