# T2a: Collapsed Panel Expand Affordances

**Priority:** High — new users can't discover how to re-expand panels  
**Estimate:** 45 min  
**Phase:** 5 (UI Polish)

---

## Context

The QuoteWorkspace uses `react-resizable-panels` for a three-column layout (Intake | Results | AI Assistant). When the left or right panels are collapsed, they shrink to near-zero width with no visual indicator that they exist or can be expanded. A new user who collapses a panel has no way to know it's still there.

## Tasks

### 1. Add collapsed state detection
- In `components/quote/quote-workspace.tsx`, track which panels are collapsed using the `onCollapse`/`onExpand` callbacks from `react-resizable-panels`
- Store collapsed state in component state or the existing `ui-store`

### 2. Collapsed panel visual treatment — Left (Intake)
- When collapsed, render a narrow vertical bar (~40px wide) with:
  - A right-pointing chevron icon (`ChevronRight` from Lucide)
  - Vertical text label "INTAKE PROFILE" (rotated 90° with CSS `writing-mode: vertical-rl`)
  - Click anywhere on the bar to expand the panel
- Background: subtle `bg-muted` or `bg-sidebar` to distinguish from content area

### 3. Collapsed panel visual treatment — Right (AI Assistant)
- Same pattern as left but mirrored:
  - Left-pointing chevron (`ChevronLeft`)
  - Vertical text "AI ASSISTANT"
  - Click to expand

### 4. Minimum collapsed width
- Set `minSize` on collapsed panels to ensure the affordance bar is always visible (approximately 3-4% of total width)
- Currently panels may collapse to 0% — prevent this

---

## Success Criteria

- [ ] When left panel is collapsed, a labeled vertical bar with expand chevron is visible
- [ ] When right panel is collapsed, a labeled vertical bar with expand chevron is visible
- [ ] Clicking the collapsed bar expands the respective panel
- [ ] Collapsed bars have clear visual distinction from the main content area
- [ ] Panels cannot collapse below the minimum width needed to show the affordance
- [ ] Drag-to-resize still works normally when panels are expanded
- [ ] `npx tsc --noEmit` passes

## Dependencies

- `components/quote/quote-workspace.tsx` — Main layout component with `PanelGroup`, `Panel`, `PanelResizeHandle`
- `stores/ui-store.ts` — May need collapsed state if persisting across views
- `react-resizable-panels` API — `onCollapse`, `onExpand`, `collapse()`, `expand()` methods

## Guardrails

- Do NOT change the three-column architecture
- Do NOT modify panel content components (intake-form, carrier-results, ai-assistant-panel)
- Do NOT break keyboard shortcuts if any are wired to panel toggles
- Keep all panel resize handles functional

## Failure Handling

- If `react-resizable-panels` doesn't support `onCollapse` callbacks in the installed version, use a `useEffect` that watches panel size and treats anything under threshold as "collapsed"
- If vertical text rendering is inconsistent across browsers, fall back to just an icon with a tooltip
