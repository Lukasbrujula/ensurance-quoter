# T2b: Center Panel Minimize Toggle

**Priority:** Medium — enables agents to focus on intake + AI without the results table  
**Estimate:** 1 hr  
**Phase:** 5 (UI Polish)

---

## Context

The left (Intake) and right (AI Assistant) panels can be collapsed, but the center panel (Term Life Quote Engine / Market Comparison) has no minimize option. This creates asymmetric behavior and prevents a useful workflow: an agent filling out intake while chatting with the AI assistant doesn't need the results table visible until they click "Get Quotes."

## Tasks

### 1. Add minimize toggle to center panel header
- In the center panel header (where "Term Life Quote Engine" title lives), add a minimize/collapse button
- Icon: `Minimize2` or `ChevronsDown` from Lucide when expanded, `Maximize2` or `ChevronsUp` when minimized
- Position: Right side of the header bar, before any existing controls

### 2. Minimized state rendering
- When minimized, the center panel shows only a compact horizontal bar containing:
  - The title "Term Life Quote Engine"
  - Key context: coverage amount + term duration (e.g., "$250K · 20Y")
  - API status badge (e.g., "● 8 ELIGIBLE")
  - Expand button
- Height: approximately 48-56px (single row)
- The freed vertical/horizontal space should be redistributed to the left and right panels

### 3. State management
- Track center panel collapsed state in `ui-store` alongside existing panel state
- Ensure "Get Quotes" action from intake form auto-expands the center panel (agents need to see results)
- Ensure "Refresh Rates" in the results header also auto-expands if collapsed

### 4. Keyboard shortcut (optional)
- If keyboard shortcuts exist for other panel toggles, add one for center panel (e.g., `Cmd+2` or `Alt+C`)

---

## Success Criteria

- [ ] Center panel has a visible minimize/expand toggle button in its header
- [ ] When minimized, shows compact bar with coverage, term, and eligibility count
- [ ] Clicking expand restores full center panel with all content preserved
- [ ] "Get Quotes" from intake auto-expands center panel if minimized
- [ ] Left and right panels gain usable space when center is minimized
- [ ] Panel resize handles still work correctly with center minimized
- [ ] `npx tsc --noEmit` passes

## Dependencies

- `components/quote/quote-workspace.tsx` — Panel layout
- `components/quote/carrier-results.tsx` — Center panel content, "Refresh Rates" button
- `components/quote/intake-form.tsx` — "Get Quotes" button triggers
- `stores/ui-store.ts` — Panel state management

## Guardrails

- Do NOT lose center panel content/state when minimized (no unmounting — just visual collapse)
- Do NOT break the existing panel resize behavior
- Do NOT modify the quote API call logic
- Center panel should NEVER be fully hidden (always show the compact bar minimum)

## Failure Handling

- If `react-resizable-panels` doesn't support programmatic size changes cleanly, implement minimize as a CSS height collapse within the panel rather than changing panel sizes
- If auto-expand on "Get Quotes" creates race conditions with the quote API response, expand first with a brief delay before the API call fires
