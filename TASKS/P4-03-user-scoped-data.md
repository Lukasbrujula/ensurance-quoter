# Task: P4-03-user-scoped-data

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code), Supabase MCP
- **Human Checkpoint**: Test that two different accounts see different lead lists

## Depends On
- P4-01 (auth infrastructure) must be complete and committed
- Does NOT depend on P4-02 (auth pages). Can run in parallel.

## Description

Two related changes in one task — both are about "each agent only sees their own data":

**Part A**: Replace every reference to the hardcoded `DEV_AGENT_ID` with the real authenticated user's UUID from Supabase Auth sessions.

**Part B**: Enable Row Level Security (RLS) on all 4 database tables so Supabase itself enforces data isolation at the database level — even if there's a code bug, the database won't leak data across agents.

## Part A: Replace Hardcoded Agent ID

### Research First
Search the entire codebase for all occurrences of:
- `DEV_AGENT_ID`
- `dev-agent-001`
- `agent_id`
- `agentId`

Map every file that references these so nothing is missed.

### Files to Modify

#### 1. `lib/constants.ts`
- Remove or deprecate `DEV_AGENT_ID`
- If removing would break imports, replace with a clear error:
  ```typescript
  /** @deprecated Use requireUser().id instead */
  export const DEV_AGENT_ID = "REMOVED_USE_AUTH"
  ```

#### 2. `lib/actions/leads.ts` (server actions)
Every server action that currently uses DEV_AGENT_ID must instead get the user ID from the session:
```typescript
import { requireUser } from "@/lib/supabase/auth-server"

export async function createLead(data: CreateLeadInput) {
  const user = await requireUser()
  // Use user.id instead of DEV_AGENT_ID
  return await insertLead({ ...data, agent_id: user.id })
}
```

Apply to ALL actions: `createLead`, `updateLead`, `createLeadsFromCSV`, and any others that reference agent_id.

#### 3. `lib/supabase/leads.ts` (data access layer)
- Functions that filter by agent_id should receive it as a parameter
- Don't hardcode agent_id at the data layer — let the server action pass it
- Example: `getLeads(agentId: string)` instead of `getLeads()` with hardcoded ID

#### 4. `lib/supabase/calls.ts`
- Review if any functions reference agent_id directly
- Call logs are scoped by lead_id (which is already agent-scoped), so these may not need changes
- Verify and document

#### 5. `lib/store/lead-store.ts`
- `hydrateLeads()` calls server actions that will now use session-based agent_id
- Remove any direct DEV_AGENT_ID references
- The store itself shouldn't know about agent_id — it just calls actions

#### 6. API routes that create or filter data
- `/api/call-log` POST — if it references agent_id, get from session via `requireUser()`
- `/api/quote` — check if it associates quotes with an agent
- Review all routes for DEV_AGENT_ID usage

#### 7. `components/quote/intake-form.tsx`
- If the agent card references DEV_AGENT_ID for display, switch to `useAuth()` hook
- (This may already be handled by P4-02 if it runs first — check and skip if done)

### Existing Data Migration
Existing dev data has `agent_id = "dev-agent-001"`. After this change:
- New data gets the real user UUID
- Old dev data won't show up for real users (RLS will filter it)
- This is fine — dev data is test data. Real accounts start fresh.
- If needed later, one SQL UPDATE can reassign dev data to a real user

## Part B: RLS Policies

### What is RLS?
Row Level Security makes the DATABASE check who's asking before returning data. Without RLS, `SELECT * FROM leads` returns ALL leads. With RLS, it only returns leads where `agent_id` matches the logged-in user. This is a safety net on top of the application code.

### Execute via Supabase MCP (preferred) or raw SQL

#### `leads` table
```sql
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own leads" ON leads
  FOR SELECT USING (agent_id = auth.uid()::text);

CREATE POLICY "Agents can create own leads" ON leads
  FOR INSERT WITH CHECK (agent_id = auth.uid()::text);

CREATE POLICY "Agents can update own leads" ON leads
  FOR UPDATE USING (agent_id = auth.uid()::text);

CREATE POLICY "Agents can delete own leads" ON leads
  FOR DELETE USING (agent_id = auth.uid()::text);
```

#### `enrichments` table
```sql
ALTER TABLE enrichments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own enrichments" ON enrichments
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()::text)
  );

CREATE POLICY "Agents can create own enrichments" ON enrichments
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()::text)
  );
```

#### `quotes` table
```sql
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own quotes" ON quotes
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()::text)
  );

CREATE POLICY "Agents can create own quotes" ON quotes
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()::text)
  );
```

#### `call_logs` table
```sql
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own call_logs" ON call_logs
  FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()::text)
  );

CREATE POLICY "Agents can create own call_logs" ON call_logs
  FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE agent_id = auth.uid()::text)
  );
```

### Important: Service Role Bypass
The service role client (`lib/supabase/server.ts`) bypasses RLS by design. This is correct and needed for:
- Server actions that need to create data during auth flows
- Background jobs, migration scripts
- Any operation where the user context isn't available

The auth client (`lib/supabase/auth-server.ts`) respects RLS — use this for user-facing queries going forward.

### Post-RLS Verification
After enabling RLS, verify the app still works:
1. Server actions using service role client → should still work (bypasses RLS)
2. Client-side queries (if any use anon key directly) → may break if no session. These need to go through server actions instead.
3. Test: create a lead → should appear in list. Create a second account → should NOT see first account's leads.

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. Zero references to `DEV_AGENT_ID` in active code paths (ok in comments/deprecation notices)
3. New leads have the real user UUID as agent_id
4. RLS enabled on all 4 tables (leads, enrichments, quotes, call_logs)
5. Leads list only shows leads belonging to the logged-in user
6. CSV upload creates leads with real user ID
7. Service role operations still work (server actions, background saves)
8. App doesn't crash — all existing features still load

## On Completion
- Update CLAUDE.md noting RLS is active
- Commit: `feat: replace hardcoded agent ID with auth user + enable RLS on all tables`
