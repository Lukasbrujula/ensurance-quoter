# Task: 02-lead-type-and-store

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
- [x] Bash: `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `lib/types/carrier.ts`, `lib/types/quote.ts` (extend, don't change)
- [ ] Do NOT modify: `components/ui/*`
- [ ] Do NOT delete: existing EnrichmentResult type (Lead references it)
- [ ] Do NOT skip: TypeScript strict mode compliance

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/types/ai.ts` (EnrichmentResult, EnrichmentAutoFillData), `lib/types/quote.ts` (QuoteRequest, QuoteResponse), `lib/types/database.ts` (from Task 01)
- [ ] Current state audit: All state currently in QuotePageClient useState. No global store exists.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `lib/types/lead.ts` exists with Lead interface that references EnrichmentResult, QuoteRequest, QuoteResponse
- [ ] `lib/store/lead-store.ts` exists with Zustand store: activeLead, leads[], setActiveLead, updateLead, addLead
- [ ] `lib/store/ui-store.ts` exists with Zustand store: panel visibility/sizes, activeView (list/detail)
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task 01 must be complete (database types exist)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/02-lead-type-and-store.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Zustand persist middleware conflicts with SSR
- [ ] Type conflicts between existing interfaces and new Lead type

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Create the Lead as a first-class type that unifies all existing data (enrichment, quotes, intake) under one entity. Add Zustand stores for lead state management and UI state, replacing the scattered useState calls in QuotePageClient.

## Acceptance Criteria
- [ ] `Lead` type includes: id, firstName, lastName, email, phone, state, age, gender, tobaccoStatus, source, enrichment (EnrichmentResult | null), quotes (QuoteResponse[]), callLogs, rawCsvData, createdAt, updatedAt
- [ ] `LeadStore` Zustand store with: leads, activeLead, isLoading, addLead, setActiveLead, updateActiveLead, saveLead (Supabase), loadLeads (Supabase)
- [ ] `UIStore` Zustand store with: leftPanelOpen, rightPanelOpen, activeView ('list' | 'detail' | 'quote'), panelSizes
- [ ] Both stores use `zustand` (install if not present: `bun add zustand`)
- [ ] Types compile with `bunx tsc --noEmit`

## Steps (high-level, /plan will expand)
1. Install zustand: `bun add zustand`
2. Create `lib/types/lead.ts` — Lead interface that composes existing types
3. Create `lib/store/lead-store.ts` — Zustand store with lead CRUD + Supabase sync methods
4. Create `lib/store/ui-store.ts` — Zustand store for panel state and view routing
5. Create `lib/supabase/leads.ts` — data access functions (getLeads, getLead, saveLead, updateLead)
6. Run `bunx tsc --noEmit` to verify

## On Completion
- **Commit:** `feat: add Lead type system and Zustand stores`
- **Update:** [x] CLAUDE.md (add Zustand to tech stack, add store/ to directory structure)
- **Handoff notes:** Lead type and stores are ready. Task 03 (CSV upload) will use addLead(). Task 04 (lead list) will use leads[] from store. QuotePageClient will be refactored in Task 06 to use stores instead of useState.

## Notes
- Do NOT refactor QuotePageClient yet — that's Task 06. Just create the stores.
- Supabase sync can be stubbed initially (save to store + console.log) if Supabase isn't fully set up yet. The important thing is the type system and store shape.
- Lead.enrichment should be the full EnrichmentResult from `lib/types/ai.ts` — don't create a separate slimmed type.
- Consider Zustand's `subscribeWithSelector` for components that only need part of the store.
- **Important for Task 07:** Include a `dirtyFields: Set<string>` (or similar) in the LeadStore to track which intake fields the agent has manually edited. Task 07 (enrichment pipeline) needs this so PDL auto-fill doesn't overwrite manual edits. Add helper methods: `markFieldDirty(field)`, `clearDirtyFields()`, `isFieldDirty(field)`.