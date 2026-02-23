# T3: Carrier Results Bug Fixes

**Priority:** Medium — visible data bugs on the core product screen  
**Estimate:** 20 min  
**Phase:** 5 (UI Polish)

---

## Context

The carrier results table has several visual bugs and labeling issues visible in the current build. These are quick fixes but they affect credibility during a demo walkthrough.

## Tasks

### 1. Fix duplicate feature tags on Foresters
- **Bug:** Foresters Financial shows "Only carrier giving non-smoker rates to vapers (YourTerm product)" appearing TWICE — once in the feature pills row and again below it
- **Likely cause:** The component is rendering both `keyFeatures` and `sellingPoints` arrays from the carrier data, and the same string exists in both arrays. OR the render logic maps the same array twice.
- **Fix:** Deduplicate the feature/selling point arrays before rendering. Use a `Set` or filter to ensure no string appears more than once per carrier row.
- **Files to check:** `components/quote/carrier-results.tsx` and `lib/data/carriers.ts` (Foresters entry)

### 2. Rename "APPLY NOW" button
- **Issue:** "APPLY NOW" is consumer-facing language. This is an agent tool — agents don't "apply" through a quoting platform.
- **Rename to:** "View Details" — this opens the carrier detail modal which is where agents get the info they need
- **Alternative:** If the button does something other than open the detail modal (e.g., links to carrier portal), label it "Start App" or "Carrier Portal" and keep a separate "Details" chevron/button
- **Verify:** What does the APPLY NOW button actually do? Check the `onClick` handler in `carrier-results.tsx`

### 3. Differentiate "BEST" value badge from AM Best rating badge
- **Issue:** The green "BEST" badge (indicating best price/value carrier) visually competes with the AM Best rating badges ("A+ Superior", "A Excellent")
- **Fix options:**
  - Change "BEST" badge to a different color (gold/amber for "best value") 
  - Change shape: use a star icon + "Best Value" text instead of a pill badge
  - Or add an icon prefix: `🏆 BEST` or `⭐ BEST VALUE`
- **Goal:** An agent glancing at the table should instantly distinguish "this carrier has the best price" from "this carrier has an A+ AM Best rating"

---

## Success Criteria

- [ ] Foresters shows each feature tag exactly once — no duplicates
- [ ] "APPLY NOW" button is renamed to appropriate agent-facing label
- [ ] "BEST" value indicator is visually distinct from AM Best rating badges
- [ ] All other carrier rows still render correctly (check AMAM, MOO, LGA, SBLI at minimum)
- [ ] Carrier detail modal still opens correctly from whatever button/click triggers it
- [ ] `npx tsc --noEmit` passes

## Dependencies

- `components/quote/carrier-results.tsx` — Feature tag rendering, button labels, badge styling
- `lib/data/carriers.ts` — Carrier data (check if duplicates are in the data vs the render logic)

## Guardrails

- Do NOT change carrier data values (intelligence data is verified from official guides)
- Do NOT remove feature tags — only deduplicate
- Do NOT modify the carrier detail modal content or tabs
- Do NOT change the match scoring algorithm or "Best Match" tier logic

## Failure Handling

- If deduplication removes tags that are intentionally different but look similar, compare strings case-insensitively and only remove exact matches
- If renaming the button breaks a click handler, trace the onClick to understand what it does before renaming
