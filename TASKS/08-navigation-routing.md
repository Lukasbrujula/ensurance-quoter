# Task: 08-navigation-routing

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
- [ ] Do NOT modify: `app/auth/*` routes, `app/page.tsx` (landing page)
- [ ] Do NOT break: existing `/quote` route (keep it working for anonymous quick-quote)
- [ ] Do NOT skip: loading states during route transitions

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `app/layout.tsx` (root layout), `app/quote/page.tsx`, all files created in Tasks 04-05
- [ ] Current state audit: Routes exist for /, /auth/*, /quote, /dashboard/*. No /leads route yet.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `/leads` route shows lead list view
- [ ] `/leads/[id]` route shows lead detail with three-column quote layout
- [ ] `/quote` route still works for quick anonymous quoting (no lead context)
- [ ] Navigation bar/sidebar allows switching between Leads, Quick Quote, and Settings
- [ ] Breadcrumb on lead detail: Leads > [Lead Name]
- [ ] Browser back button works correctly between list and detail
- [ ] Unsaved changes prompt: if agent navigates away from lead detail with unsaved changes, show confirmation
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task 04 (lead list view)
- [x] Task 05b (lead detail route at /leads/[id])
- [x] Task 06 (resizable panels)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/08-navigation-routing.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Next.js App Router parallel routes or intercepting routes useful for list/detail pattern
- [ ] Zustand state loss during route transitions

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Wire up the navigation between lead list, lead detail, and quick quote views. Add a minimal navigation bar so agents can move between sections. Ensure browser navigation (back/forward) works correctly and unsaved changes are protected.

## Acceptance Criteria
- [ ] Top navigation bar with: Leads (primary), Quick Quote, Settings (links to /dashboard/profile)
- [ ] Active route highlighted in nav
- [ ] `/leads` loads lead list
- [ ] `/leads/[id]` loads lead detail with pre-populated data
- [ ] `/quote` loads existing quote engine (no lead context — quick anonymous quote)
- [ ] Breadcrumbs on lead detail page
- [ ] Loading skeleton while lead data fetches
- [ ] "Unsaved changes" dialog on navigation away from dirty lead detail
- [ ] Mobile: nav collapses to hamburger menu (1024px breakpoint)

## Steps (high-level, /plan will expand)
1. Create `app/leads/layout.tsx` — layout for leads section
2. Create `app/leads/page.tsx` — lead list page wrapper
3. Create `app/leads/[id]/page.tsx` — lead detail page wrapper
4. Create `components/navigation/top-nav.tsx` — navigation bar component
5. Add top-nav to root layout or leads layout
6. Add breadcrumb component to lead detail
7. Add loading.tsx files for loading skeletons
8. Implement unsaved changes detection using Zustand store dirty flag
9. Add `beforeunload` event listener for browser tab close with unsaved changes
10. Test full navigation flow: landing → leads → lead detail → back → different lead → quick quote

## On Completion
- **Commit:** `feat: add navigation and routing for leads CRM`
- **Update:** [x] CLAUDE.md (add /leads routes) [x] PROJECT_SCOPE.md (mark Phase 1 complete)
- **Handoff notes:** Phase 1 is complete. Agent can upload CSVs, browse leads, click into detail, enrich, quote, and save. Everything persists. Phase 2 refines the enrichment flow and Phase 3 adds calling.

## Notes
- The nav bar should be minimal — don't over-design it. Ensurance branding + 3-4 links + user avatar.
- Consider whether `/leads` and `/quote` should share a layout or have separate layouts. Shared layout = consistent nav. Separate = different sidebar contexts.
- The quick quote route (`/quote`) is important for Max demos — don't break it.
- Later phases will add more nav items (Calls, Analytics) — design the nav to accommodate growth.