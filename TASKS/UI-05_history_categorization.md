# UI-05: History View — Categorized Activity Feed

## Model
Claude Opus 4.6

## Objective
The history window currently shows all activity mixed together in a single chronological feed. Reorganize it into categorized views so agents can quickly find specific activity types instead of scrolling through everything.

## Tools Required
- File editor
- TypeScript compiler (`bunx tsc --noEmit`)

## What to Do

### 1. Audit current history implementation
- Route: `/history` or a history component/tab
- Identify what activity types currently exist in the feed (likely some combination of: calls, quotes, lead updates, notes, SMS messages, enrichments, settings changes)
- Note the data source — is this pulling from multiple Supabase tables or a single activity log?

### 2. Design category tabs/filters
- Add a tab bar or segmented control at the top of the history view:
  - **All** — Everything (current behavior, default)
  - **Calls** — Call logs, recordings, transcripts, summaries
  - **Quotes** — Quote requests, results, comparisons
  - **Messages** — SMS sent/received, email (if integrated)
  - **Notes** — Manual notes added to leads
  - **System** — Enrichments, settings changes, login activity (catch-all for less frequent events)
- Each tab shows a count badge if practical (e.g., "Calls (12)")

### 3. Implement filtering
- If history data has a `type` or `activity_type` field, filter on it
- If not, categorize by source table:
  - `call_logs` → Calls
  - `quotes` → Quotes  
  - SMS/inbox messages → Messages
  - Lead field updates / notes → Notes
  - Everything else → System
- Maintain chronological order within each category
- Support combining filters (e.g., "Calls" + a date range)

### 4. Visual differentiation
- Each activity type should have a distinct icon and subtle color accent:
  - Calls: `Phone` icon, blue accent
  - Quotes: `Calculator` or `FileText` icon, green accent
  - Messages: `MessageSquare` icon, purple accent
  - Notes: `StickyNote` or `Pencil` icon, yellow accent
  - System: `Settings` or `Activity` icon, gray accent
- Use these consistently in both the "All" view (as left-side icons) and the filtered views

### 5. Improve the "All" view
- Even in the "All" tab, group by date (Today, Yesterday, This Week, Earlier)
- Each item should show: icon + type label + brief description + timestamp + associated lead name (linked)

## Guardrails
- Do NOT delete or modify the underlying data — this is display/filter only
- Do NOT load all history at once — maintain pagination or infinite scroll
- Keep the "All" view as the default (don't force users into categories)
- Run `bunx tsc --noEmit` after changes

## Success Criteria
- Category tabs exist and filter the activity feed correctly
- "All" view still shows everything chronologically, now with type icons
- Each category only shows relevant activity
- Activity items have clear visual type indicators
- Date grouping in the "All" view (Today, Yesterday, etc.)
- No TypeScript errors

## Dependencies
- Existing history page/component
- Supabase tables: `call_logs`, `quotes`, `leads`, any activity/notes tables
- Lucide icons for category indicators

## Failure Handling
- If there's no dedicated history route, it may be a tab within the lead detail or dashboard — adapt accordingly
- If activity data doesn't have a clear type field, add logic to infer type from the source table or data shape
