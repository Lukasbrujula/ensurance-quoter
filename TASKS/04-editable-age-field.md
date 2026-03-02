# Task: 04-editable-age-field

## Status
- [x] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `bunx tsc --noEmit`
- [ ] Grep, Glob (search)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`
- [ ] Do NOT remove: existing +/- stepper buttons — keep them, add direct edit
- [ ] Do NOT change: age validation range or form state shape

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `components/quote/intake-form.tsx` (find the age stepper component)

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Age number between +/- buttons is now a clickable, editable input
- [ ] Clicking the number selects all text for immediate typing
- [ ] Accepts only numbers 18-85 (same range as current validation)
- [ ] On blur or Enter key: validates, clamps to range, updates form state
- [ ] +/- stepper buttons still work exactly as before
- [ ] Visual style unchanged — number should look the same until clicked
- [ ] Verification: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [ ] None

### 8. Failure Handling
**Max attempts:** 2

**On failure (per attempt):**
- [ ] Check if age field uses a different component pattern than expected

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/04-editable-age-field.md` and STOP

**Rollback command:** `git checkout -- components/quote/intake-form.tsx`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Input number type quirks with stepper integration

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Make the age field directly editable. Currently agents must click +/- buttons to change age, which is slow for large jumps (e.g., setting age to 55 requires 25+ clicks from default). The number should be clickable to type directly while keeping the stepper buttons.

## Acceptance Criteria
- [ ] The age display is an `<input type="text">` (not `type="number"` — avoids browser spinner conflict with custom steppers)
- [ ] `inputMode="numeric"` and `pattern="[0-9]*"` for mobile numeric keyboard
- [ ] On click: `select()` to highlight all text for easy replacement
- [ ] On blur: parse as integer, clamp to 18-85, update form state
- [ ] On Enter key: same as blur behavior
- [ ] Invalid input (non-numeric, empty): revert to previous valid value
- [ ] Styling: matches current number display (same font size, weight, color, centered)
- [ ] Input width: 3 characters max (`w-12` or similar) — no layout shift

## Steps
1. Find the age stepper in `intake-form.tsx`
2. Replace the static number display (likely a `<span>` or `<div>`) with an `<input>`
3. Style the input to match current appearance (transparent background, centered text, same size)
4. Add `onClick` → `event.target.select()`
5. Add `onBlur` → validate, clamp, update
6. Add `onKeyDown` → Enter triggers blur logic
7. Keep +/- button onClick handlers unchanged
8. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: make age field directly editable (keep stepper buttons)`
- **Update:** N/A
- **Handoff notes:** Small UX win. No API or data changes.

## Notes
- Use `type="text"` not `type="number"` because `type="number"` adds browser increment arrows that conflict with the custom +/- buttons.
- Clamp logic: `Math.min(85, Math.max(18, parseInt(value) || previousValue))`
- The input should have `className` that makes it look like plain text until focused — no visible border until click.
