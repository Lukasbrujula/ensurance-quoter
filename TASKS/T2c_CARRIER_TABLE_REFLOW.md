# T2c: Carrier Table Responsive Reflow

**Priority:** Medium — carrier data gets cut off when panels are resized  
**Estimate:** 45 min  
**Phase:** 5 (UI Polish)

---

## Context

When the left or right panels are expanded wider, the center panel's carrier results table gets compressed. Instead of reflowing gracefully, table columns overlap or get hidden behind panel edges. The carrier name, pricing, and action columns become unreadable.

## Tasks

### 1. Add horizontal scroll to carrier results table
- Wrap the market comparison table in a horizontally scrollable container
- Use `overflow-x-auto` with a minimum table width that preserves readability
- Add subtle scroll shadow indicators on left/right edges when content overflows (CSS `background: linear-gradient(...)` technique or `scroll-shadow` utility)

### 2. Column priority system
- Define column visibility tiers for when space is constrained:
  - **Always visible:** Carrier (name + logo), Monthly Premium, Actions (View/Apply)
  - **Hide first:** Annual Premium, Commission — these are secondary data
  - **Hide second:** Product Name — can be seen in detail modal
  - **Never hide:** Carrier, Monthly, primary action button
- Implement with responsive classes or a width-based check on the panel container

### 3. Carrier row card layout at narrow widths
- Below a certain width threshold (~500px), switch from table rows to stacked card layout:
  - Carrier logo + name + rating on top
  - Monthly/Annual prices in a row
  - Feature pills wrap naturally
  - Action button full-width at bottom
- This mirrors how the carrier cards might look on mobile (even though this is panel-width responsive, not viewport-width)

### 4. Feature pills overflow handling
- The feature tag pills under each carrier row (e.g., "Only carrier giving non-smoker rates to vapers") currently show all pills. When space is tight:
  - Show first 2 pills
  - Add "+N more" pill that expands on click or shows tooltip
  - Prevent pills from wrapping into 3+ rows which pushes other carriers off screen

---

## Success Criteria

- [ ] Carrier table is readable at all panel width combinations (left expanded, right expanded, both expanded)
- [ ] Horizontal scroll works smoothly with visual scroll indicators
- [ ] At narrow widths, lower-priority columns hide gracefully
- [ ] At very narrow widths (~500px), layout switches to stacked cards
- [ ] Feature pills truncate with "+N more" when space is constrained
- [ ] All carrier data is still accessible (nothing permanently hidden — just requires scroll or click)
- [ ] `npx tsc --noEmit` passes

## Dependencies

- `components/quote/carrier-results.tsx` — Main table component
- `components/quote/carrier-card.tsx` — If a card variant exists, reuse it
- The feature pills rendering logic (wherever `keyFeatures` / `sellingPoints` are mapped)

## Guardrails

- Do NOT change the data structure or API response format
- Do NOT remove any columns permanently — only hide them responsively
- Do NOT break sort/filter functionality on the table
- Do NOT modify the carrier detail modal trigger (row click / chevron)

## Failure Handling

- If container-query CSS (`@container`) isn't supported by the build, fall back to a `ResizeObserver` hook that measures panel width and sets breakpoint classes
- If card layout at narrow widths creates too much vertical scrolling, keep table layout with horizontal scroll as the only adaptation
- Test with both 3 carriers (Best Matches) and 8+ carriers (full list) to ensure scrolling behavior scales
