# Task: 05c-add-persistence

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

### 1. Model
opus

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [ ] WebFetch (external docs)
- [x] Task (sub-agents): database-reviewer for schema validation

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT auto-save on every keystroke — explicit save action or debounced (500ms+)
- [ ] Do NOT store raw PDL API responses — extract and store only the fields we use
- [ ] Do NOT skip: RLS policies on all tables touched

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/store/lead-store.ts`, `lib/supabase/*` (from Task 01), `lib/types/carrier.ts`, `lib/types/quote.ts`, `lib/types/ai.ts`
- [ ] Task 01 schema: leads table, enrichments table, quotes table structure

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Lead fields (name, age, gender, state, tobacco, medical, coverage, term) save to `leads` table
- [ ] Enrichment results save to `enrichments` table as JSONB
- [ ] Quote request + response save to `quotes` table as JSONB (quote_request, quote_response columns)
- [ ] Page refresh on `/leads/[id]` reloads all data from Supabase — no data loss
- [ ] Loading state shown while fetching from Supabase
- [ ] Error state shown if Supabase fetch fails (with retry option)
- [ ] "Save" action persists current lead state (explicit, not auto-save on every change)
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task 05b must be complete (lead detail route with store-backed state)
- [x] Task 01 must be complete (Supabase schema: leads, enrichments, quotes tables)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach (e.g., simplify JSONB structure, add explicit column types)

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/05c-persistence.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] JSONB column size limits hit for large enrichment payloads
- [ ] Supabase RLS policies block client-side writes unexpectedly
- [ ] Zustand hydration from Supabase causes flash of empty state

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Add Supabase persistence so lead data, enrichment results, and quote results survive page refresh. Data flows: Zustand store <-> Supabase. On load, hydrate store from Supabase. On save, write store to Supabase. Explicit save action — not auto-save.

## Acceptance Criteria
- [ ] `lib/supabase/leads.ts` — CRUD functions: getLead, saveLead, updateLeadFields
- [ ] `lib/supabase/enrichments.ts` — saveEnrichment, getEnrichmentByLeadId
- [ ] `lib/supabase/quotes.ts` — saveQuoteResult, getQuotesByLeadId
- [ ] Lead detail page hydrates store from Supabase on mount (server-side or client-side fetch)
- [ ] "Save" button on lead detail persists all current state to Supabase
- [ ] Enrichment result auto-saves to Supabase when enrichment completes (no explicit save needed)
- [ ] Quote results auto-save to Supabase when quote engine returns (no explicit save needed)
- [ ] Lead list view shows latest data (re-fetches on navigation back to `/leads`)
- [ ] Dirty field tracking: enrichment auto-fill does NOT overwrite fields the agent manually edited

## Steps (high-level, /plan will expand)
1. Create `lib/supabase/leads.ts` — getLead, saveLead, updateLeadFields using Supabase client
2. Create `lib/supabase/enrichments.ts` — saveEnrichment, getEnrichmentByLeadId
3. Create `lib/supabase/quotes.ts` — saveQuoteResult, getQuotesByLeadId
4. Update lead detail page: on mount, fetch lead + enrichment + quotes from Supabase -> hydrate store
5. Add "Save" button to lead detail that writes lead fields to Supabase
6. Hook enrichment completion: after PDL returns, save to enrichments table
7. Hook quote completion: after quote engine returns, save to quotes table
8. Add loading skeleton while Supabase data loads
9. Add error boundary / retry UI for failed fetches
10. Test: fill intake -> save -> refresh page -> data still there
11. Test: enrich lead -> refresh -> enrichment data still there
12. Test: run quotes -> refresh -> quote results still there
13. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add Supabase persistence for leads, enrichments, and quotes`
- **Update:** [x] CLAUDE.md [x] PROJECT_SCOPE.md (Phase 1 progress)
- **Handoff notes:** Data now persists. Task 07 (enrichment pipeline) can build on this for the streamlined enrich -> fill -> quote flow. Task 08 (navigation) can rely on data surviving route transitions.

## Notes
- Explicit keys to persist: lead fields (name, age, gender, state, tobacco_use, medical_conditions, dui, coverage_amount, term_length), enrichment as JSONB, quote_request + quote_response as JSONB.
- The JSONB approach keeps the schema flexible — we don't need a column for every PDL field or every carrier quote detail.
- Consider optimistic updates: update store immediately, write to Supabase in background, show error toast if write fails.
- The `/quote` route (anonymous quick-quote) does NOT persist — only `/leads/[id]` persists.
