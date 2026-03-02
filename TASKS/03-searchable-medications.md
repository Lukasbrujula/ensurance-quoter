# Task: 03-searchable-medications

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
- [x] Bash: `bunx tsc --noEmit`, `bun run build`
- [x] Grep, Glob (find medication data across carrier files)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*` (shadcn components)
- [ ] Do NOT modify: `styles/globals.css`
- [ ] Do NOT modify: `lib/data/carriers.ts` or `lib/data/carriers-generated.ts` (read-only data source)
- [ ] Do NOT break: existing medical conditions combobox — use same pattern, don't refactor it

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `components/quote/medical-history-section.tsx` (contains the conditions combobox to copy pattern from AND the current medications text input to replace)
- [ ] Specific files: `lib/data/carriers.ts`, `lib/data/carriers-generated.ts` (find `prescriptionScreening` arrays — each entry has a medication name)
- [ ] Specific files: `components/ui/command.tsx`, `components/ui/popover.tsx` (shadcn combobox building blocks)

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Medications input replaced with searchable combobox matching conditions field UX
- [ ] Searches against unique medication names extracted from all carriers' `prescriptionScreening` data
- [ ] Type 2+ characters → dropdown shows matching medications (case-insensitive)
- [ ] Select medication → appears as removable chip/tag
- [ ] Multiple medications supported
- [ ] Placeholder text: "Search 7,200+ medications..."
- [ ] Debounced search (300ms)
- [ ] Selected medications feed into the quote request (same as current text input did)
- [ ] Verification: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [ ] None — existing data and components are sufficient

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] If medication data extraction fails, try alternative path (grep for prescriptionScreening patterns)
- [ ] If combobox pattern doesn't match conditions field, simplify to basic Command + Popover

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/03-searchable-medications.md` and STOP

**Rollback command:** `git checkout -- components/quote/medical-history-section.tsx`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Medication data is structured differently than expected across carrier files
- [ ] Performance issues with 7,200+ items in combobox (may need virtual scrolling)
- [ ] shadcn Command component limitations with large datasets

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Replace the plain text medication input with a searchable combobox that matches the existing conditions field pattern. Agents should be able to type a medication name, see matching results from our 7,200+ Rx database, and select entries as removable chips. This is a UX improvement that makes the demo feel polished and prevents typos in medication names.

## Acceptance Criteria
- [ ] A utility file or constant exports a deduplicated, sorted list of all medication names from carrier data
- [ ] The combobox component uses shadcn Command + Popover (same pattern as conditions)
- [ ] Typing "metf" shows "Metformin" (and any other matches)
- [ ] Typing "lisin" shows "Lisinopril" matches
- [ ] Selected medications appear as removable chips below the input
- [ ] Removing a chip removes the medication from the list
- [ ] Selected medications array is passed to the quote request for Rx screening
- [ ] No performance degradation with 7,200+ entries (limit dropdown to 20 visible results, scroll for more)
- [ ] Empty state: "No matching medications found"

## Steps
1. Explore carrier data files to find all `prescriptionScreening` entries and understand the medication name field
2. Create `lib/data/medications.ts` — extracts unique medication names from all carrier data, deduplicates, sorts alphabetically. Export as `ALL_MEDICATIONS: string[]`
3. Look at the existing conditions combobox in `medical-history-section.tsx` to understand the exact component pattern (Command, CommandInput, CommandList, CommandItem, Popover, etc.)
4. Replace the current medications text input with a combobox following that same pattern
5. Add chip/tag display for selected medications (copy from conditions if it uses tags)
6. Wire selected medications into the form state / quote request
7. Test: `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: searchable medications combobox with 7,200+ Rx database`
- **Update:** N/A
- **Handoff notes:** Medications input now matches conditions UX. The `ALL_MEDICATIONS` list in `lib/data/medications.ts` can be reused elsewhere (e.g., AI assistant context).

## Notes
- The conditions combobox is the exact pattern to follow. Study it first, then replicate for medications.
- Medication names in carrier data may have varying capitalization — normalize to Title Case for display.
- Some medications may appear with dosage info (e.g., "Metformin 500mg") — keep the full string as-is, don't strip dosage.
- If the carrier data has `prescriptionScreening` as an array of objects, the medication name field might be `medication`, `name`, `drug`, or similar — grep to find the exact field name.
- Limit visible dropdown items to ~20 with a scroll container to prevent performance issues.
- The existing medications flow sends a string[] to the quote API — keep that contract, just populate it from the combobox instead of free text.
