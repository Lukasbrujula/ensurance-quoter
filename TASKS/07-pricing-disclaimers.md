# Task: 07-pricing-disclaimers

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
- [x] Grep, Glob (find all pricing disclaimer text across components)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `styles/globals.css`
- [ ] Do NOT modify: pricing logic or rate calculations
- [ ] Do NOT use language that sounds like a guaranteed or binding quote

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: Grep for "disclaim", "estimate", "indicative", "illustrative" across all component files to find current disclaimer locations
- [ ] Specific files: `components/quote/carrier-results.tsx` (results banner), `components/quote/carrier-detail-modal.tsx` (detail modal pricing tab)

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Results page: prominent banner with strengthened disclaimer language
- [ ] Each carrier row/card: small "Estimated premium" label near the price
- [ ] Carrier detail modal pricing tab: clear disclaimer paragraph
- [ ] No language anywhere that implies rates are guaranteed, binding, or final
- [ ] Verification: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [ ] None

### 8. Failure Handling
**Max attempts:** 2

**On failure (per attempt):**
- [ ] If disclaimer components don't exist yet, create them

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/07-pricing-disclaimers.md` and STOP

**Rollback command:** `git stash`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] N/A (straightforward copy changes)

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Review and strengthen all pricing disclaimer language across the quote UI. Insurance rates shown are estimates — agents must understand these are not binding quotes. This is a compliance requirement before launch.

## Acceptance Criteria
- [ ] Results page top banner: "Estimates Only — Not a Binding Quote. Actual premiums are determined at application and are subject to underwriting approval. Rates shown are illustrative based on the information provided."
- [ ] Each carrier card/row: label text "Est. monthly" or "Estimated" near premium amount (not just "$XX/mo")
- [ ] Carrier detail modal, pricing section: "These rates are estimates based on the information provided. Final premium will be determined during the carrier's underwriting process and may differ based on health history, lab results, and other factors."
- [ ] Footer or bottom of results: "Ensurance provides estimated quotes for informational purposes only. This is not a contract or guarantee of coverage."
- [ ] grep for any remaining language like "your rate is", "your premium", "guaranteed" and replace with "estimated" equivalents

## Steps
1. Grep across all `components/quote/` files for pricing disclaimer text, "estimate", "disclaim", "illustrative", price display patterns
2. Update results page banner text
3. Update carrier row/card price labels
4. Update carrier detail modal pricing tab disclaimer
5. Add footer disclaimer if not present
6. Scan for any language that implies guaranteed rates and soften it
7. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `fix: strengthen pricing disclaimer language across quote UI`
- **Update:** N/A
- **Handoff notes:** Disclaimer language should be reviewed by someone with insurance compliance knowledge before launch. This is a reasonable starting point but not legal advice.

## Notes
- Disclaimer text should be visible but not obnoxious. Use muted text color, smaller font size for inline labels. The banner can be more prominent.
- The detail modal disclaimer should be in its own section or clearly separated from the price display.
- Don't add disclaimers to the AI chat responses — that's a separate concern.
- Keep existing disclaimer styling if it's already themed — just update the copy.
