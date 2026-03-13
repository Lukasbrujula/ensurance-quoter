# UI-03: Resizable Lead Detail Sidebar (Leads + Pipeline)

## Model
Claude Opus 4.6

## Objective
Fix the lead detail sidebar that appears when clicking a lead in `/leads` and contacts in `/pipeline`. Currently the sidebar is:
1. Slightly cut off on the right edge — content overflows or is clipped
2. Not expandable/collapsible — no drag handle to resize
3. Not using the same resizable panel pattern already established in the quote workspace

Replace with the same `react-resizable-panels` approach used in the quote page's three-column layout.

## Tools Required
- File editor
- TypeScript compiler (`bunx tsc --noEmit`)
- Browser testing

## What to Do

### 1. Audit the current sidebar implementation
- Check `components/leads/` — likely a fixed-width sidebar or Sheet component
- Check the pipeline contact detail view — same issue
- Note what data is displayed (lead info, contact details, notes, actions)
- Identify why it's getting cut off (likely fixed width + no overflow handling)

### 2. Identify the existing resizable panel pattern
- The quote workspace (`components/quote/quote-workspace.tsx`) already uses `react-resizable-panels` with `<PanelGroup>`, `<Panel>`, `<PanelResizeHandle>`
- Reuse this exact same pattern and styling for consistency

### 3. Implement for Leads page
- In the `/leads` route, when a lead is selected:
  - The main content area (lead table) becomes a `<Panel>` with `minSize`
  - The lead detail sidebar becomes a `<Panel>` with `defaultSize`, `minSize`, and `collapsible`
  - A `<PanelResizeHandle>` sits between them with a visible drag indicator
- The sidebar should:
  - Default to ~35-40% width (enough to show all content without clipping)
  - Be draggable to expand up to ~60% or collapse to 0%
  - Have a collapse/expand toggle button (chevron icon)
  - Show ALL content without clipping at default size
  - Scroll internally if content exceeds height

### 4. Implement for Pipeline page
- Same pattern as leads — when clicking a contact in the pipeline:
  - Pipeline board/columns remain in a `<Panel>`
  - Contact detail sidebar opens as a `<Panel>` with resize handle
  - Same min/max/default sizes and collapse behavior

### 5. Visual consistency
- The resize handle should look identical to the one in quote-workspace
- Use the same handle component (likely a thin vertical bar with a grip icon)
- Smooth open/close animation
- Keyboard accessible (arrow keys to resize when handle is focused)

### 6. Fix the content clipping
- Ensure the sidebar panel has `overflow-y: auto` for vertical scrolling
- Ensure no fixed widths on child elements that would cause horizontal overflow
- All content should be visible at the default panel size without horizontal scrolling

## Guardrails
- Do NOT modify the quote workspace's existing resizable panels
- Do NOT change the data displayed in the sidebar — only the container/layout
- Reuse `react-resizable-panels` — it's already a dependency, don't add a new one
- Run `bunx tsc --noEmit` after changes

## Success Criteria
- Lead sidebar shows ALL content without clipping at default size
- Sidebar can be dragged to expand or shrink
- Sidebar can be collapsed completely via drag or toggle button
- Pipeline contact detail has the same resizable behavior
- Resize handle matches the quote workspace visual style
- Content scrolls vertically when it exceeds the sidebar height
- No TypeScript errors

## Dependencies
- `react-resizable-panels` (already installed)
- Existing lead detail components
- Existing pipeline contact detail components

## Failure Handling
- If pipeline page doesn't exist yet, only implement for `/leads` and note pipeline as TODO
- If the sidebar is currently a shadcn `<Sheet>` (slide-over), convert it to an inline panel instead
