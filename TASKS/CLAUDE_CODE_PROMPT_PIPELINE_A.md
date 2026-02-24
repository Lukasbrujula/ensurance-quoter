# Lead Pipeline A — Schema + Status Badge + Table Integration

## Context

Adding pipeline stages to the CRM. This task covers the foundation: database columns, types, the status badge component, and wiring it into the lead table with filtering.

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
cat components/leads/lead-table.tsx
cat components/leads/lead-details-section.tsx
cat lib/store/lead-store.ts | head -60
grep -rn "interface Lead\|type Lead" lib/ components/ --include="*.ts" --include="*.tsx"
grep -rn "leads" lib/supabase/ --include="*.ts" -l
```

## Step 1 — Database migration

Add columns to the `leads` table:

```sql
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'quoted', 'applied', 'issued', 'dead')),
  ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_note TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date) WHERE follow_up_date IS NOT NULL;
```

If you can't run the migration directly, create `supabase/migrations/add_lead_pipeline.sql` and document it.

Note: `follow_up_date` and `follow_up_note` columns are added now but the UI for them comes in Pipeline B. Just add the columns so the schema is complete.

## Step 2 — Update Lead type

Find the Lead TypeScript interface and add:

```typescript
status: 'new' | 'contacted' | 'quoted' | 'applied' | 'issued' | 'dead';
follow_up_date: string | null;
follow_up_note: string | null;
```

Create pipeline stage constants:

```typescript
// lib/data/pipeline.ts
export const PIPELINE_STAGES = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'quoted', label: 'Quoted', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'applied', label: 'Applied', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'issued', label: 'Issued', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'dead', label: 'Dead', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
] as const;

export type PipelineStatus = typeof PIPELINE_STAGES[number]['value'];
```

## Step 3 — StatusBadge component

Create `components/leads/status-badge.tsx`:

A colored badge showing the current pipeline stage. Clicking it opens a small popover/dropdown to change the status.

- Uses colors from PIPELINE_STAGES
- Compact enough for a table cell
- Dropdown uses shadcn Popover or DropdownMenu
- On change: update Zustand store optimistically, persist to Supabase in background, toast on success
- When changing to "Dead", maybe a subtle confirmation (or just allow it — agents know what they're doing)

## Step 4 — Add status column to lead table

In `components/leads/lead-table.tsx`:

- Add a "Status" column showing the StatusBadge (clickable to change)
- Table should be sortable by status
- "Dead" leads should be visually dimmed (opacity-60 or similar)

## Step 5 — Add status filters

Above the lead table, add filter controls:

- Status filter: pill buttons or a dropdown to filter by one or more stages
- Default: show all except "Dead" (common pattern — dead leads hidden by default, toggle to show)
- Filter state can live in the UI store or local component state

Keep existing search and sort — these are additive.

## Step 6 — Show status on lead detail

In the lead detail header area, show the StatusBadge prominently near the lead's name.

## Step 7 — Update lead store

Make sure the lead store handles the new `status` field:
- Default value for new leads: 'new'
- Persist status changes to Supabase
- Include status in any lead create/update operations

## Step 8 — Verify

```bash
npx tsc --noEmit
bun run build
```

## Rules

- Status values are predefined — no custom stages
- Optimistic updates: change badge immediately, persist in background
- Don't break existing lead table functionality (search, sort, CSV upload)
- Dark mode compatible
- Don't build follow-up picker UI — that's Pipeline B
- Don't build auto-status suggestions — that's Pipeline C
