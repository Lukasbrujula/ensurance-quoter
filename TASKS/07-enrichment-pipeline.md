# Task: 07-enrichment-pipeline

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `lib/engine/*` (eligibility, pricing, scoring logic)
- [ ] Do NOT auto-trigger quote engine — agent must click "Get Quotes"
- [ ] Do NOT delete: existing enrichment API route (`/api/enrichment`)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `components/quote/lead-enrichment-popover.tsx` (current dual-action UI), `components/quote/intake-form.tsx` (current auto-fill logic), `components/quote/ai-assistant-panel.tsx` (current enrichment trigger location)
- [ ] Current state audit: Enrichment currently has two separate buttons: "Apply to Intake" (fills 3 fields) and "Analyze with AI" (sends to chat). Only fills age, gender, state.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] "Enrich" button auto-fills ALL available fields from PDL into intake form (not just age/gender/state)
- [ ] After enrichment, auto-fill includes: name, age, gender, state, and any inferable fields
- [ ] Enrichment results saved to lead.enrichment in Zustand store + Supabase
- [ ] Single "Send to AI" button replaces dual-action buttons — sends enrichment context to AI chat
- [ ] Agent reviews auto-filled intake form, adjusts if needed, then clicks "Get Quotes"
- [ ] "Get Quotes" button is prominent and clear after enrichment fills fields
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task 02 must be complete (Lead store with enrichment persistence)
- [x] Task 05a must be complete (Zustand-backed intake state)
- [x] Task 05c must be complete (enrichment + quote persistence to Supabase)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/07-enrichment-pipeline.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] PDL fields don't map cleanly to intake fields
- [ ] Auto-fill overwrites agent's manual edits unexpectedly

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Streamline the enrichment → intake → quote flow so it's a smooth pipeline: agent clicks "Enrich" → PDL data auto-fills all available intake fields → agent reviews/adjusts → agent clicks "Get Quotes". Replace the current dual-action buttons with a cleaner single flow.

## Acceptance Criteria
- [ ] Enrichment fills: firstName, lastName (into name field), age (estimated or actual), gender (from sex), state (from location)
- [ ] If PDL returns occupation/industry data, it's shown in the AI panel for context but doesn't fill a form field
- [ ] "Apply to Intake" and "Analyze with AI" replaced with single "Send to AI" button (enrichment auto-fills intake automatically)
- [ ] Enrichment auto-fill does NOT overwrite fields the agent has already manually edited
- [ ] "Get Quotes" button is visually prominent after enrichment (e.g., pulsing border, primary color)
- [ ] Toast notification after enrichment: "Lead enriched — X fields updated. Review and run quote."
- [ ] If enrichment fails or returns no data, show clear error and allow manual entry

## Steps (high-level, /plan will expand)
1. Expand `EnrichmentAutoFillData` type to include: name, age, gender, state (currently only age, gender, state)
2. Update enrichment → auto-fill logic to push all available fields
3. Add "dirty field" tracking: if agent manually edited a field, enrichment won't overwrite it
4. Simplify enrichment UI: remove "Apply to Intake" button (auto-fill happens automatically on enrich)
5. Replace "Analyze with AI" with "Send to AI" that sends enrichment context to chat
6. Add visual prominence to "Get Quotes" button after enrichment fills fields
7. Add toast notification after successful enrichment
8. Save enrichment result to lead store + Supabase

## On Completion
- **Commit:** `feat: streamline enrichment → intake auto-fill pipeline`
- **Update:** [ ] CLAUDE.md
- **Handoff notes:** The enrich → fill → quote pipeline is now smooth. Phase 1 is complete after this task + Task 08 (navigation). Phase 2 tasks will refine this further.

## Notes
- Key UX principle: enrichment is a HELPER, not a replacement for agent judgment. Auto-fill is a suggestion that the agent confirms.
- The "dirty field" tracking is important — if an agent corrects a field (e.g., changes state from what PDL returned), enrichment shouldn't undo that.
- PDL free tier has limited data — some fields may come back null. The UI should gracefully handle partial enrichment.
- Consider showing a small "enriched" badge next to fields that were auto-filled, so agent knows what came from PDL vs. their own input.