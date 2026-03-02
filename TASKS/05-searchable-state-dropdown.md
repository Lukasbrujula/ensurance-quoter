# Task: 05-searchable-state-dropdown

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
- [x] Grep, Glob (find current state select implementation)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`
- [ ] Do NOT change: the list of states/territories or their values
- [ ] Do NOT change: the form state shape — output should still be the same state code (e.g., "TX")

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `components/quote/intake-form.tsx` (find the current state Select component)
- [ ] Specific files: `components/ui/command.tsx`, `components/ui/popover.tsx` (shadcn combobox pattern)

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] State dropdown replaced with searchable combobox (Popover + Command pattern)
- [ ] Type "tex" → filters to "Texas (TX)"
- [ ] Type "NY" → filters to "New York (NY)"
- [ ] Matches on both full name and abbreviation
- [ ] Selecting a state closes dropdown and updates form
- [ ] Selected state displayed as button text (e.g., "Texas" or "TX - Texas")
- [ ] Search input clears when dropdown closes
- [ ] Verification: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [ ] None

### 8. Failure Handling
**Max attempts:** 2

**On failure (per attempt):**
- [ ] If shadcn Command pattern doesn't fit, use a simpler filtered Select with input

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/05-searchable-state-dropdown.md` and STOP

**Rollback command:** `git checkout -- components/quote/intake-form.tsx`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] shadcn Combobox pattern vs Select pattern differences

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Replace the basic state dropdown with a searchable combobox. Agents quote clients from all 50 states + DC + territories — scrolling through a long list every time is tedious. Typing a few characters should filter instantly.

## Acceptance Criteria
- [ ] Combobox shows all states + DC + territories (same list as current dropdown)
- [ ] Search matches on state name AND abbreviation (case-insensitive)
- [ ] Single selection — only one state at a time
- [ ] Selected value feeds same state code to form state (e.g., "CA", "TX")
- [ ] Dropdown closes on selection
- [ ] Search text resets on close
- [ ] Placeholder when nothing selected: "Select state..."
- [ ] Keyboard accessible: arrow keys, Enter to select, Escape to close

## Steps
1. Find the current state Select component in `intake-form.tsx`
2. Get the full state list (likely defined as an array of `{ value: "CA", label: "California" }` or similar)
3. Replace the Select with a Popover + Command combobox:
   - Popover trigger: button showing selected state name
   - Popover content: CommandInput for search + CommandList with CommandItems
4. Filter logic: `states.filter(s => s.label.toLowerCase().includes(query) || s.value.toLowerCase().includes(query))`
5. On select: update form state with state code, close popover
6. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: searchable state dropdown with name and abbreviation filter`
- **Update:** N/A
- **Handoff notes:** Small UX win. Same component pattern as conditions and medications comboboxes.

## Notes
- This is the third combobox in the intake form (conditions, medications, state). Make sure the visual style is consistent across all three.
- The state list is small (53 items) so no virtualization needed — just a filtered list.
- Consider showing the abbreviation alongside the name in the dropdown: "California (CA)" or "CA — California"
