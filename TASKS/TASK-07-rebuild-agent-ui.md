# Task: REBUILD-AGENT-UI

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
- [x] Bash: `npx tsc --noEmit`
- [x] Grep, Glob (search)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/` (shadcn components), auth routes, quote engine, calling components
- [ ] Do NOT touch Telnyx API calls — this task is UI only
- [ ] Do NOT use arbitrary pixel values — use Tailwind scale only (per GLOBAL_RULES.md)
- [ ] Do NOT hide critical actions (Test Call, Edit Agent) behind hover states on mobile

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md
- [x] GLOBAL_RULES.md — mobile-first, no arbitrary values, shadcn/ui patterns
- [x] CODEBASE_AUDIT.md — current agent page structure
- [ ] Run `ui-reviewer` agent first OR manually audit current `app/agents/page.tsx` for overflow/clipping issues before writing new code

**Known UI issues to fix (from screenshot review):**
- Agent cards overflow their container border
- Error badge ("Error") and Active badge misaligned
- Toggle switch clips outside card boundary
- "Test Call" and "Edit Agent" buttons too close together, crowded on small screens
- No empty state when no agents exist

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Agent cards render without overflow or clipping at all viewport sizes (mobile 375px → desktop 1440px)
- [ ] Active/Error badges render inside the card, not overlapping the border
- [ ] Toggle switch is fully contained within the card
- [ ] Empty state shown when no agents exist: illustration + "Create your first agent" CTA
- [ ] "Test Call" and "Edit Agent" buttons have adequate spacing (min 8px gap, both visible on mobile)
- [ ] `npx tsc --noEmit` passes clean

### 7. Dependencies
- [ ] Task 01 (CONSOLIDATE-AGENT-TYPES) should be complete — so the UI shows the correct unified agent type

### 8. Failure Handling
**Max attempts:** 3

**On failure:**
- Attempt 1: Retry
- Attempt 2: Fix overflow/clipping only (highest priority) — skip empty state and button spacing
- Attempt 3: Save error to `ERRORS/task-07.md` and STOP

**Rollback:** `git stash && git checkout HEAD~1`

---

## Description
Rebuilds the Agents page card UI to fix the layout issues visible in the current screenshot: overflowing cards, misaligned badges, clipped toggles, and crowded action buttons. The goal is a clean, contained card layout that works at all screen sizes and is visually consistent with the rest of the platform (shadcn/ui, Tailwind, OKLCH color system). No functional changes — purely layout and visual fixes.

## Acceptance Criteria
- [ ] All cards render cleanly at 375px, 768px, and 1280px viewport widths
- [ ] Badges contained within cards
- [ ] Toggle fully within card
- [ ] Empty state implemented
- [ ] Action buttons not crowded
- [ ] No TypeScript errors

## Steps
1. Audit current `app/agents/page.tsx` and agent card component — identify all overflow/clipping sources
2. Fix card container: ensure `overflow-hidden`, proper padding, no absolute-positioned children breaking out
3. Fix badge positioning: use relative positioning within card header, not absolute offset from card edge
4. Fix toggle: ensure it's a flex child within the card, not positioned outside
5. Add empty state component
6. Fix button layout: use `flex gap-2` or similar, ensure both buttons visible on mobile
7. Test at mobile/tablet/desktop
8. `npx tsc --noEmit`

## On Completion
- **Commit:** `fix: rebuild agent card UI — overflow, badges, toggle, empty state`
- **Handoff notes:** This is purely visual. All functional tasks (01-06) are independent of this.
