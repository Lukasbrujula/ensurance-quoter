# UI-06: Quote Results — Improve Carrier Card Density and Spacing

## Model
Claude Opus 4.6

## Objective
The market comparison section (middle panel in the quote view) feels too bunched up — carrier rows, badges, and data are cramped even when the side panels are collapsed. Improve the information density, spacing, and readability of the carrier results table.

## Tools Required
- File editor
- TypeScript compiler (`bunx tsc --noEmit`)
- Browser testing at various panel widths

## Context
Looking at the current UI (screenshot reference):
- The carrier rows show: carrier logo + name, product name, AM Best rating, est. monthly, est. annual, commission, and a "View Details" button
- Below each carrier row are feature badges (e.g., "Most lenient carrier for non-cigarette nicotine users", "Convertible until age 70", "Living benefits: Terminal")
- Rate class pills show below some carriers (e.g., "Preferred $41.13/mo", "Regular Plus $61.25/mo")
- Everything is squeezed horizontally even when the side panels are collapsed

## What to Do

### 1. Audit current layout
- File: `components/quote/carrier-results.tsx` (and any sub-components like `carrier-card.tsx`)
- Measure current padding, gaps, font sizes
- Identify what's causing the cramped feeling

### 2. Increase vertical breathing room
- Add more vertical spacing between carrier rows (currently they're too tight)
- Increase padding inside each carrier card/row: at minimum `py-5 px-6` (up from whatever it is now)
- Add clear visual separation between carriers — either a heavier divider, or card-style with gap between cards
- The feature badges below each carrier need more top margin (they're hugging the carrier info row)

### 3. Improve horizontal layout
- The column headers (Carrier, Product Name, Rating, Est. Monthly, Est. Annual, Commissions, Actions) need better proportional widths:
  - Carrier column (logo + name): needs more width — logos + text are cramped
  - Product name: adequate
  - Rating: compact is fine (badge)
  - Monthly/Annual: can be slightly wider, right-aligned for readability
  - Commissions: reduce width — it's a simple percentage display
  - Actions (View Details): fixed width button
- Consider making the pricing columns more prominent — larger font for monthly premium since that's what agents care about most

### 4. Feature badges layout
- The intelligence badges below each carrier (nicotine info, conversion age, living benefits) should:
  - Wrap naturally without overflowing
  - Have consistent `gap-2` between badges
  - Use slightly smaller text (`text-xs`) to differentiate from primary data
  - The highlighted badge (yellow/green — the carrier's key differentiator) should remain visually distinct

### 5. Rate class pills
- The rate class section (e.g., "Preferred $41.13/mo | Regular Plus $61.25/mo") should:
  - Be visually grouped as a sub-section, not inline with badges
  - Have a subtle background or left border to distinguish from feature badges
  - The selected/best rate class should be highlighted (it already has a green pill — keep that)

### 6. Responsive behavior
- When side panels are collapsed (full width for results): use the extra space for more padding, not wider columns
- When side panels are open (narrower results): gracefully compress — hide less important columns or stack on smaller widths
- At minimum: ensure the carrier name, monthly premium, and "View Details" are always visible regardless of width

### 7. "Best Matches" vs "Other" section headers
- Add more visual weight to the "BEST MATCHES" header — slightly larger, with a subtle top border or accent
- Add clear separation between the Best Matches section and the Others section (more gap or a distinct divider)

## Guardrails
- Do NOT change the data being displayed — only layout, spacing, and visual treatment
- Do NOT change the sorting/filtering logic
- Do NOT modify the carrier detail modal or comparison feature
- Use Tailwind classes only — no arbitrary values unless absolutely necessary
- Run `bunx tsc --noEmit` after changes

## Success Criteria
- Carrier results feel spacious and scannable, not cramped
- Each carrier row has clear visual boundaries
- Monthly premium is the most prominent number in each row
- Feature badges are readable but secondary to pricing data
- Layout looks good with side panels open AND collapsed
- Best Matches section is visually distinct from Others
- No TypeScript errors

## Dependencies
- `components/quote/carrier-results.tsx`
- Any carrier card sub-components
- Tailwind classes only

## Failure Handling
- If changes make the table too tall (too much scrolling), find a balance — the goal is readable, not wasteful of space
- Test with both 3 Best Matches + 8 Others (full results) and 1-2 results (sparse results)
