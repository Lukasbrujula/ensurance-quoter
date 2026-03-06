# Task: CONSOLIDATE-AGENT-TYPES

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
- [ ] Do NOT modify: `lib/engine/`, `components/quote/`, `components/leads/`, auth routes
- [ ] Do NOT delete: existing Telnyx assistant creation logic
- [ ] Do NOT skip: TypeScript check after changes
- [ ] Do NOT add hangup tool to the tools array (known WebRTC breaker — see Knowledge)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [x] CODEBASE_AUDIT.md — current agent architecture, components/calling/, app/agents/
- [ ] Read current `app/agents/page.tsx` and all files under `components/agents/` or equivalent
- [ ] Read current Telnyx assistant creation API call (search for `v2/ai/assistants` POST)

**Critical gotchas from prior research:**
- Model MUST be `Qwen/Qwen3-235B-A22B` — Llama outputs JSON as speech
- Do NOT add `{ type: 'hangup' }` to tools — breaks WebRTC agents (use separate task for this)
- Do NOT explicitly set `voice_speed`, `time_limit_secs`, or `noise_suppression` — let Telnyx handle defaults
- Telnyx uses `POST` not `PATCH` for updates

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] The Agents page shows a single agent type called "Inbound Agent" — no dropdown or selection between FAQ / Scheduling / Insurance Intake types
- [ ] The "Create Agent" button creates one unified agent (not a wizard that asks which type)
- [ ] Existing agents in the DB still render without errors
- [ ] `npx tsc --noEmit` passes clean

### 7. Dependencies
- [ ] None — can start immediately

### 8. Failure Handling
**Max attempts:** 3

**On failure:**
- Attempt 1: Retry same approach
- Attempt 2: Scope down — just rename the type labels without restructuring the wizard
- Attempt 3: Save error to `ERRORS/task-01.md` and STOP

**Rollback:** `git stash && git checkout HEAD~1`

---

## Description
The current Agents page exposes three separate agent type options (FAQ Handler, Scheduling, Insurance Intake). Non-technical insurance brokers don't understand the distinction, and all three functions can be handled by one prompt. This task collapses the three types into a single "Inbound Agent" type so the create flow is unambiguous. The underlying Telnyx assistant creation payload does not change — only the UI type selection and any type-based branching logic is removed.

## Acceptance Criteria
- [ ] Agent type selector removed from create flow (or hardcoded to single type)
- [ ] All existing agents display correctly regardless of their stored type value
- [ ] No TypeScript errors
- [ ] No console errors on the Agents page

## Steps
1. Audit `app/agents/` and `components/agents/` (or wherever agent creation UI lives) — find where agent type is selected
2. Find where agent type maps to different prompt templates or Telnyx payloads
3. Collapse the three types into one: rename to "Inbound Agent", remove the type selector UI
4. Ensure the Telnyx payload still sends correctly with a single unified agent name/type
5. Run `npx tsc --noEmit`

## On Completion
- **Commit:** `refactor: collapse agent types into single inbound agent`
- **Handoff notes:** Task 02 adds the unified prompt template. Task 03 adds the language specialist toggle.
