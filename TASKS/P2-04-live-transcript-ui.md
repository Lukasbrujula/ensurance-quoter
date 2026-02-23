# Task: P2-04-live-transcript-ui

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
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT break: existing AI chat functionality — chat must still work when no call is active
- [ ] Do NOT delete: any existing ai-assistant-panel.tsx functionality (extend it)
- [ ] Do NOT hardcode: speaker names (use "Agent" / "Client" labels, configurable later)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `components/quote/ai-assistant-panel.tsx` (the panel being extended), `lib/store/call-store.ts` (transcript[] and coachingHints[] to read from), `lib/types/call.ts` (TranscriptEntry, CoachingHint types)
- [ ] Current state audit: AI panel currently has: streaming chat, proactive insight cards, enrichment trigger header. During a call, it transforms to show live transcript instead.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] AI panel detects active call (reads callState from call-store) and switches to "call mode"
- [ ] Call mode shows: scrolling transcript with speaker labels, coaching hints inline, call info header
- [ ] Transcript entries render in real-time as they arrive in the store
- [ ] Agent speech: left-aligned, blue-ish background
- [ ] Client speech: right-aligned, gray background
- [ ] Interim (non-final) results: shown in lighter/italic text, replaced when final version arrives
- [ ] Auto-scroll: new entries scroll into view. If user manually scrolls up, auto-scroll pauses. New entry indicator shows "↓ New messages" to resume.
- [ ] Coaching hints: appear as colored badges/cards inline between transcript entries
- [ ] When call ends: panel stays in transcript view for review, with "Return to Chat" button
- [ ] When user clicks "Return to Chat": panel switches back to normal AI chat mode
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-01 must be complete (call store exists)
- [x] Task P2-03 should be complete (transcript entries flowing into store) — but UI can be built with mock data first

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-04-live-transcript-ui.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Auto-scroll + manual scroll override is tricky with React's rendering cycle
- [ ] Performance issues with rendering hundreds of transcript entries (may need virtualization)
- [ ] Interim result replacement causes visual jitter

---

## Human Checkpoint
- [x] **NONE** — proceed automatically (UI work, testable with mock transcript data)

---

## Description
Extend the AI assistant panel with a "call mode" that shows live transcription during active calls. The panel switches between normal chat mode (existing) and call mode (new) based on call state. This is purely UI — it reads from the call store that Task P2-03 populates.

## Acceptance Criteria
- [ ] Seamless mode switching: chat mode ↔ call mode based on callState
- [ ] Call mode header: "Live Call — [lead name] — [phone number] — [mm:ss timer]"
- [ ] Transcript bubbles with speaker labels and timestamps
- [ ] Interim results (typing indicator equivalent) shown as gray italic text
- [ ] Coaching hint cards: colored by type (info=blue, warning=amber, tip=green), appear inline in transcript flow
- [ ] Auto-scroll behavior: auto-scroll on by default, pauses when user scrolls up, "↓ New" button to resume
- [ ] Post-call state: transcript stays visible, coaching hints remain, "Return to Chat" button appears
- [ ] Chat history preserved — switching back to chat mode shows previous chat messages
- [ ] Empty transcript state: "Waiting for speech..." message while call is active but no speech yet
- [ ] Responsive: works at panel minimum width (280px) — bubbles stack properly

## Steps (high-level)
1. Create `components/calling/transcript-view.tsx` — the scrolling transcript component
2. Create `components/calling/transcript-entry.tsx` — individual bubble component (agent/client variants)
3. Create `components/calling/coaching-hint-card.tsx` — inline coaching hint display
4. Create `components/calling/call-mode-header.tsx` — call info bar at top of panel
5. Modify `components/quote/ai-assistant-panel.tsx`:
   a. Import useCallStore
   b. If callState is active/held/ending → render call mode (transcript view)
   c. If callState is idle → render chat mode (existing)
   d. After call ends → render transcript review mode with "Return to Chat" button
6. Implement auto-scroll with manual override:
   a. Use `useRef` for scroll container
   b. `onScroll` handler detects manual scroll (scrollTop < scrollHeight - clientHeight - threshold)
   c. When auto-scroll is off, show floating "↓ New messages" button
   d. Clicking button or new entry when at bottom re-enables auto-scroll
7. Add mock transcript data for development/testing (toggle with env var or dev button)
8. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add live transcript UI to AI panel with call mode switching`
- **Update:** [ ] CLAUDE.md
- **Handoff notes:** AI panel now has call mode. It reads transcript[] and coachingHints[] from call-store. Task P2-05 populates coachingHints[]. The auto-scroll behavior and bubble rendering are complete.

## Notes
- The AI panel currently uses shadcn ScrollArea. Keep using it for the transcript view — consistent styling.
- For interim results: store both interim and final entries. When a final entry arrives with the same start timestamp, replace the interim one. This prevents ghost duplicates.
- Coaching hints have a `timestamp` that positions them in the transcript flow. Render them between the transcript entries they fall between chronologically.
- Consider a small animation when new coaching hints appear (fade in from right) to draw attention without being distracting.
- The "call mode" should feel like a natural extension of the panel, not a completely different UI. Keep the same background, scrollbar, padding.
- Include a "Copy Transcript" button in post-call review mode for agents who want to paste it somewhere.
- **Reuse existing color/icon maps**: `INSIGHT_ICONS` and `INSIGHT_COLORS` from `ai-assistant-panel.tsx` already map `'warning' | 'tip' | 'info'` to colors and icons. Extract these to a shared location (or import from the panel) for coaching hint cards — same type enum, consistent styling.
