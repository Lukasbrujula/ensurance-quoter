# Task: 05a-refactor-state-to-zustand

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
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*` (eligibility, pricing, scoring)
- [ ] Do NOT break: existing quote engine pipeline (intake -> API -> results)
- [ ] Do NOT add: new routes, Supabase calls, or persistence logic
- [ ] Do NOT change: any visible UI behavior — this is a pure state refactor

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `app/quote/quote-page-client.tsx` (all useState calls live here), `components/quote/intake-form.tsx`, `components/quote/carrier-results.tsx`, `components/quote/ai-assistant-panel.tsx`, `components/quote/lead-enrichment-popover.tsx`
- [ ] Current state audit: Map every useState in QuotePageClient and trace each one to its consumers/setters

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] All useState calls in QuotePageClient replaced with Zustand store selectors/actions
- [ ] State moved: intakeData, quoteResponse, enrichmentResult, selectedCarriers, comparisonCarriers
- [ ] Child components receive data from store (useLeadStore / useUIStore) instead of props
- [ ] `/quote` route works exactly as before — intake -> Get Quotes -> results render -> AI panel updates
- [ ] Enrichment popover still works: search -> enrich -> auto-fill -> view results
- [ ] Carrier detail modal and comparison sheet still open/close correctly
- [ ] No new routes created, no Supabase calls added
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task 02 must be complete (Lead type + Zustand stores)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach (e.g., migrate one useState at a time instead of all at once)

**After max attempts exhausted:**
- [ ] Escalate to human immediately

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] QuotePageClient state is more tightly coupled than expected (e.g., derived state, useEffect chains)
- [ ] Zustand selectors cause unnecessary re-renders — note which selectors need shallow comparison
- [ ] AI panel system prompt breaks because it relied on specific prop-drilling paths

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Pure state refactor: replace all useState calls in QuotePageClient with Zustand store selectors and actions. No new routes, no persistence, no UI changes. The goal is to decouple state from the component tree so that 05b (lead detail route) and 05c (persistence) can build on a clean foundation.

## Acceptance Criteria
- [ ] QuotePageClient has zero useState calls for domain data (intakeData, quoteResponse, enrichmentResult, selectedCarriers, comparisonCarriers)
- [ ] Local UI state (e.g., modal open/close) may remain as useState — only domain state moves to Zustand
- [ ] All child components read from store instead of receiving props for domain data
- [ ] The AI panel's system prompt still receives intakeData and quoteResponse correctly from the store
- [ ] Existing `/quote` route is the ONLY route — no `/leads/[id]` yet
- [ ] Manual smoke test passes: fill intake -> click Get Quotes -> results appear -> open carrier detail -> open comparison -> enrich lead -> AI chat works

## Steps (high-level, /plan will expand)
1. Audit `app/quote/quote-page-client.tsx` — list every useState, its type, default value, and every component that reads/writes it
2. Map each useState to the appropriate Zustand store (LeadStore for domain data, UIStore for panel/modal state)
3. Add actions to stores: setIntakeData, setQuoteResponse, setEnrichmentResult, setSelectedCarriers, setComparisonCarriers
4. Refactor QuotePageClient: replace useState with useLeadStore/useUIStore selectors
5. Refactor child components: replace prop reads with store selectors
6. Remove now-unused props from component interfaces
7. Verify AI panel still builds system prompt correctly from store data
8. Run `bunx tsc --noEmit`
9. Manual smoke test the full flow

## On Completion
- **Commit:** `refactor: migrate QuotePageClient state to Zustand stores`
- **Update:** [ ] CLAUDE.md (note that quote state now lives in Zustand)
- **Handoff notes:** State is now centralized. 05b can create `/leads/[id]` that reads from the same store. 05c can add persistence by subscribing to store changes.

## Notes
- This is the hardest part of the original Task 05. Take it slow — one useState at a time.
- The `/quote` route should keep working as an anonymous quick-quote tool (no lead context). Initialize the store with empty defaults when no lead is loaded.
- Key state to migrate: intakeData, quoteResponse, enrichmentResult, selectedCarriers, comparisonCarriers.
- Keep ephemeral UI state (modal open, popover open) as local useState — don't over-centralize.
