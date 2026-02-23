# Task: 06-resizable-panels

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
- [ ] Do NOT modify: `components/ui/resizable.tsx` (use as-is from shadcn)
- [ ] Do NOT break: existing three-column layout functionality
- [ ] Do NOT skip: minimum panel widths (prevent content from becoming unusable)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `app/quote/quote-page-client.tsx` (current fixed-width layout), `lib/store/ui-store.ts` (panel state from Task 02), `components/ui/resizable.tsx` (shadcn component — already installed)
- [ ] Current state audit: Three columns are fixed: 480px (intake) | flex (results) | 340px (AI panel). No resizing.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Three-column layout uses shadcn ResizablePanelGroup with ResizablePanel + ResizableHandle
- [ ] Each panel has a collapse button (minimize to icon bar)
- [ ] Each panel has a close button (hide completely, redistribute space)
- [ ] Minimum widths enforced: intake ≥ 320px, results ≥ 400px, AI panel ≥ 280px
- [ ] Panel state persisted in UIStore (Zustand) — survives navigation between leads
- [ ] Double-click on handle resets to default sizes
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task 02 must be complete (UIStore with panel state)
- [x] Task 05a must be complete (Zustand-backed state in quote layout)
- [x] Task 05b must be complete (lead detail view uses the layout)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/06-resizable-panels.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] shadcn ResizablePanel has issues with dynamic content height
- [ ] Zustand persist causes hydration mismatches with panel sizes

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Replace the fixed-width three-column layout with resizable, collapsible panels using the shadcn resizable component. Agents can drag dividers to resize, collapse panels to a thin icon bar, or close them entirely to focus on one area.

## Acceptance Criteria
- [ ] Drag handles between all three panels
- [ ] Collapse button on each panel → shrinks to ~40px icon bar with expand button
- [ ] Close button on each panel → hides completely, remaining panels fill space
- [ ] When only one panel is open, it takes full width
- [ ] Panel state (open/closed/sizes) stored in UIStore
- [ ] Layout doesn't break on window resize
- [ ] Works on 1024px+ viewports (tablet landscape and up)

## Steps (high-level, /plan will expand)
1. Review shadcn `ResizablePanelGroup` API and behavior
2. Replace the current flex layout in quote-page-client (or lead-detail-client) with ResizablePanelGroup
3. Wrap each column (intake, results, AI panel) in ResizablePanel
4. Add ResizableHandle between panels
5. Add collapse/expand buttons to each panel header
6. Add close/open toggle per panel
7. Wire panel state to UIStore (sizes, open/closed)
8. Add minimum size constraints
9. Test at various viewport widths (1024, 1280, 1536, 1920)

## On Completion
- **Commit:** `feat: add resizable collapsible panels to three-column layout`
- **Update:** [ ] CLAUDE.md
- **Handoff notes:** Layout is now flexible. Agents can customize their workspace. This affects both `/leads/[id]` and `/quote` routes.

## Notes
- shadcn resizable uses `react-resizable-panels` under the hood — it's well-tested
- The collapsed icon bar should show meaningful icons: form icon (intake), chart icon (results), sparkle/chat icon (AI)
- Consider keyboard shortcuts: Ctrl+1/2/3 to toggle panels
- The existing keyboard shortcuts in quote-page-client (ALT+S, etc.) should still work