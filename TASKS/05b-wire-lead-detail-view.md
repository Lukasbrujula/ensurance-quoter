# Task: 05b-wire-lead-detail-view

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
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT break: existing `/quote` route (anonymous quick-quote must still work)
- [ ] Do NOT add: Supabase persistence — that's 05c
- [ ] Do NOT duplicate: the three-column layout — reuse the same components from `/quote`

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `app/quote/quote-page-client.tsx` (refactored in 05a), `lib/store/lead-store.ts` (from Task 02), all `components/quote/*`
- [ ] Task 04 output: lead list view with row click handler

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `/leads/[id]` route exists and renders the three-column layout
- [ ] Clicking a lead from the lead list (Task 04) navigates to `/leads/[id]`
- [ ] activeLead is set in Zustand store on navigation, intake form pre-populates from lead data
- [ ] If lead has existing enrichment data in store, it's available in the AI panel
- [ ] If lead has existing quote results in store, they display in the center column
- [ ] "Back to Leads" button navigates to `/leads` without losing other leads' data
- [ ] `/quote` route still works independently (no lead context, empty defaults)
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task 05a must be complete (Zustand-backed state)
- [x] Task 04 must be complete (lead list with row click)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach

**After max attempts exhausted:**
- [ ] Escalate to human immediately

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Next.js App Router dynamic routes require special handling for Zustand hydration
- [ ] Shared layout between `/quote` and `/leads/[id]` causes unexpected re-renders or state bleed

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Create the `/leads/[id]` route that loads a lead from the Zustand store and displays it in the existing three-column quote layout. The lead list (Task 04) provides the entry point — clicking a row navigates here. No persistence yet (that's 05c) — data lives in-memory in Zustand.

## Acceptance Criteria
- [ ] `app/leads/[id]/page.tsx` — server component that extracts the lead ID from params
- [ ] `components/leads/lead-detail-client.tsx` — client component that sets activeLead and renders the three-column layout
- [ ] Intake form pre-populates: name, age, gender, state, tobacco, medical conditions from lead record
- [ ] Enrichment data (if present on lead) is accessible in AI panel
- [ ] Quote results (if present on lead) display in center column
- [ ] "Back to Leads" button/breadcrumb returns to `/leads`
- [ ] New/empty lead (no prior data) shows the layout with empty defaults
- [ ] The shared quote components (intake-form, carrier-results, ai-assistant-panel) work identically in both `/quote` and `/leads/[id]` contexts

## Steps (high-level, /plan will expand)
1. Create `app/leads/[id]/page.tsx` — extract ID, render LeadDetailClient
2. Create `components/leads/lead-detail-client.tsx` — set activeLead in store, render three-column layout
3. Wire lead list row click (Task 04) to `router.push(/leads/${id})`
4. Ensure intake form reads from activeLead when present, falls back to empty defaults
5. Add "Back to Leads" navigation (button or breadcrumb)
6. Test: create lead via CSV -> click from list -> intake shows lead data -> run quote -> go back -> click different lead
7. Test: `/quote` route still works independently
8. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add lead detail view at /leads/[id] with three-column layout`
- **Update:** [ ] CLAUDE.md (add /leads/[id] route)
- **Handoff notes:** Lead detail is in-memory only. 05c adds Supabase persistence so data survives page refresh. Task 06 enhances the layout with resizable panels.

## Notes
- The key architectural question: should `/leads/[id]` and `/quote` share a component, or should lead-detail-client wrap quote-page-client? Prefer composition — lead-detail-client sets store state, then renders the same child components.
- Don't create a separate copy of the three-column layout. Reuse components.
- activeLead in store should be cleared when navigating away from lead detail (or set to a different lead when clicking another row).
