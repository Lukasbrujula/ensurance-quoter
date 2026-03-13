# UI-02: Draggable Dashboard Widgets

## Model
Claude Opus 4.6

## Objective
Make dashboard widgets/cards rearrangeable via drag-and-drop within the dashboard layout. Agents should be able to customize their dashboard by dragging cards to reorder them. Persist the layout order per agent.

## Tools Required
- File editor
- npm/bun for dependency installation
- TypeScript compiler (`bunx tsc --noEmit`)

## What to Do

### 1. Identify the dashboard layout
- Route: `/dashboard` or the main authenticated landing page
- Identify all dashboard widget/card components (likely things like: recent leads, call stats, quote activity, upcoming follow-ups, etc.)
- Note the current grid/flex layout structure

### 2. Install a lightweight drag-and-drop library
- **Recommended:** `@dnd-kit/core` + `@dnd-kit/sortable` — modern, accessible, lightweight, works well with React
- Install: `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Do NOT use react-beautiful-dnd (deprecated) or react-dnd (heavier than needed)

### 3. Implement sortable grid
- Wrap dashboard widgets in `<DndContext>` + `<SortableContext>`
- Each widget gets a `<SortableItem>` wrapper with a drag handle
- Add a subtle drag handle icon (grip dots from Lucide: `GripVertical`) to the top-right or top-left of each card header
- On drag end, reorder the widgets array and persist

### 4. Visual feedback
- Show a subtle lift/shadow effect on the dragged card (CSS transform + box-shadow)
- Show a placeholder/ghost where the card will drop
- Smooth animation on reorder (dnd-kit handles this with CSS transitions)
- Drag handle should have `cursor: grab` (and `cursor: grabbing` while dragging)

### 5. Persist layout order
- Store widget order as a JSON array in `agent_settings` (Supabase) — add a `dashboard_layout` column if needed, or store in the existing `carrier_commissions`-style jsonb pattern
- On page load, read the saved order; if none exists, use default order
- Debounce save (don't hit the API on every drag — wait 1-2 seconds after last reorder)

## Guardrails
- Do NOT break existing dashboard functionality — widgets must still show the same data
- Do NOT modify `components/ui/` shadcn files
- Drag-and-drop must be keyboard accessible (dnd-kit supports this out of the box)
- Mobile: drag should work via long-press or be disabled on mobile with a fallback "move up/down" button
- Run `bunx tsc --noEmit` after changes

## Success Criteria
- Dashboard widgets can be dragged and dropped to reorder
- Layout persists across page refreshes (saved to Supabase)
- Drag handle is visible and intuitive
- Smooth animations during drag
- No layout jank or broken cards after reorder
- No TypeScript errors

## Dependencies
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (new install)
- Existing Supabase client for persistence
- Dashboard page component

## Failure Handling
- If Supabase column doesn't exist, create a migration to add `dashboard_layout jsonb` to `agent_settings`
- If dnd-kit causes bundle size concerns, it's ~15KB gzipped total — acceptable
