# Task: AUTO-CREATE-LEAD-FROM-CALL

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `npx tsc --noEmit && bun run build`
- [x] Grep, Glob (search)

### 3. Guardrails (DO NOT)
- [ ] Do NOT expose the webhook endpoint without verifying the request comes from Telnyx (check for shared secret or Telnyx signature header)
- [ ] Do NOT create duplicate leads — check if a lead with the same phone number already exists for this agent before inserting
- [ ] Do NOT block the Telnyx webhook response — respond 200 immediately, process async
- [ ] Do NOT modify the quote engine or existing lead management components

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md
- [x] CODEBASE_AUDIT.md — leads table schema (agent_id, name, phone, state, tobacco, etc.), RLS policies, auth-guard pattern for API routes
- [ ] Read `app/api/call-log/route.ts` — follow this pattern for the new webhook endpoint
- [ ] Read `lib/supabase/` for existing lead insert patterns
- [ ] Read current Telnyx agent prompt (Task 02 output) — understand what fields the agent collects

**Lead fields to collect during call (align with leads table schema):**
- name (required)
- phone (required — may come from caller ID)
- coverage_interest (e.g., "term life, $500K")
- tobacco status (yes/no)
- age or date of birth
- state (can infer from area code as fallback)

**Webhook flow:**
1. Telnyx calls POST `/api/agents/intake-webhook` at end of call
2. Payload contains extracted variables (name, phone, coverage_interest, etc.)
3. Endpoint checks: does lead with this phone + agent_id already exist?
4. If no: insert new lead into `leads` table with `source: 'ai_agent'`
5. Respond 200

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `POST /api/agents/intake-webhook` endpoint exists and is auth-guarded
- [ ] Endpoint parses Telnyx webhook payload and extracts: name, phone, and any available insurance fields
- [ ] New lead is inserted into `leads` table with `source: 'ai_agent'` when phone number is not already in leads for this agent
- [ ] Duplicate check works — second call from same number does not create second lead
- [ ] `npx tsc --noEmit` passes clean
- [ ] `bun run build` passes clean

### 7. Dependencies
- [ ] Task 02 (UNIFIED-PROMPT-TEMPLATE) complete — prompt must instruct agent to collect the right fields
- [ ] Existing `leads` table with RLS must be in place (confirmed in CODEBASE_AUDIT)

### 8. Failure Handling
**Max attempts:** 3

**On failure:**
- Attempt 1: Retry
- Attempt 2: Simplify — create lead with name + phone only, skip insurance fields
- Attempt 3: Save error to `ERRORS/task-06.md` and STOP

**Rollback:** `git stash && git checkout HEAD~1`
Note: Any leads created during testing can be deleted via the Leads UI.

---

## Description
Closes the intake loop: when the AI agent collects a caller's information during an inbound call, a lead is automatically created in the Leads CRM. Telnyx fires a webhook at end-of-call containing extracted variables from the conversation. The webhook endpoint parses this payload and inserts a new lead record, with duplicate protection by phone number per agent. This makes the AI agent genuinely useful for lead generation — not just answering questions.

## Acceptance Criteria
- [ ] Webhook endpoint created at `/api/agents/intake-webhook`
- [ ] Lead auto-created in Supabase when agent collects name + phone
- [ ] Duplicate prevention working
- [ ] Lead visible in `/leads` page immediately after call
- [ ] No TypeScript or build errors

## Steps
1. Read `app/api/call-log/route.ts` to understand existing webhook/API pattern
2. Create `app/api/agents/intake-webhook/route.ts`
3. Add Telnyx signature verification (or shared secret check matching existing auth-guard pattern)
4. Parse webhook body for extracted variables
5. Query leads table: does phone + agent_id already exist?
6. If not: insert lead with `source: 'ai_agent'`, populate available fields
7. Respond 200 immediately
8. `npx tsc --noEmit && bun run build`

## On Completion
- **Commit:** `feat: auto-create lead from agent intake call webhook`
- **Human Checkpoint:** ✅ REQUIRED — review the webhook endpoint auth before exposing publicly
- **Handoff notes:** Notification task (in-app alert when lead is created) is deferred — flagged for future phase.
