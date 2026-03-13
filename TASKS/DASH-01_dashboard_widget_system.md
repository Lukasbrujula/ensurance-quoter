# DASH-01: Dashboard Widget System — Picker UI, Real Data, New Widgets

## 1. Model

Use **Opus** for the widget picker architecture and first 5-6 widgets, **Sonnet** for the remaining widgets (pattern is established by then). This is a large feature — break into two sessions.

## 2. Tools Required

- **Codebase files** (read first):
  - `components/dashboard/dashboard-client.tsx` — Main dashboard with dnd-kit drag-and-drop
  - `components/dashboard/sortable-widget.tsx` — dnd-kit sortable wrapper
  - `components/dashboard/dashboard-charts.tsx` — Recharts line + pie charts (MOCK DATA — needs fixing)
  - `components/dashboard/dashboard-goals.tsx` — Goals with localStorage (needs Supabase migration later)
  - `components/dashboard/calendar-view.tsx` — Mini calendar widget
  - `components/dashboard/business-profile-card.tsx` — Business profile widget
  - `app/api/dashboard/stats/route.ts` — Dashboard KPI stats API
  - `app/api/dashboard/calendar/route.ts` — Merged follow-ups + Google events
  - `app/api/settings/dashboard-layout/route.ts` — Widget layout persistence
  - `lib/supabase/dashboard.ts` — 6 parallel stat queries
  - `lib/supabase/usage.ts` — Usage aggregation + cost estimation
  - `lib/supabase/inbox.ts` — Conversation previews (for unread counts)
  - `lib/supabase/notifications.ts` — Derived notifications
  - `app/api/agents/usage/route.ts` — AI agent usage stats
  - `app/api/activity-log/history/route.ts` — Global activity history

- **Supabase MCP** for any schema changes
- **Existing shadcn/ui components**: Card, Badge, Button, Dialog/Sheet, Switch, Recharts

## 3. Guardrails

- **DO NOT** modify the quote engine, carrier data, pricing logic, or eligibility engine
- **DO NOT** modify Telnyx calling, AI agents, SMS, or email integration code
- **DO NOT** modify auth middleware, Clerk config, or Supabase client files
- **DO NOT** break the existing drag-and-drop functionality — the widget picker adds to it, doesn't replace it
- **DO NOT** create new API routes for every widget — widgets should call existing endpoints or query Supabase directly via existing utility functions. Combine queries where possible.
- **DO NOT** remove any existing widgets — all 10 current widgets must remain available
- Keep each widget self-contained — fetches its own data on mount, handles its own loading/error states
- Use the existing `Skeleton` component for loading states (consistent with the loading.tsx files)

## 4. Knowledge

### Current Dashboard Architecture

The dashboard in `dashboard-client.tsx` renders a fixed set of widgets using `@dnd-kit/core` and `@dnd-kit/sortable`. Each widget is wrapped in `sortable-widget.tsx`. The widget order is stored in `agent_settings.dashboard_layout` (JSON array of widget IDs) via `/api/settings/dashboard-layout`.

Currently, ALL widgets are always rendered — there's no concept of "hidden" widgets. The layout array controls ORDER but not VISIBILITY.

### What Needs to Change

The `dashboard_layout` column should store an object like:
```typescript
{
  active: ['total-leads', 'calls', 'pipeline', ...],  // visible, in order
  hidden: ['ai-agent-summary', 'commission-estimate', ...]  // available but not shown
}
```

Or simpler: just store the active widget IDs as an array. Any widget NOT in the array is considered hidden/available. Default new users get a sensible preset.

### Mock Data That Needs Fixing

1. **Activity Overview chart** (`dashboard-charts.tsx`) — Line chart showing "New Leads, Calls Made, Quotes Run" over Nov-Mar. Currently uses hardcoded mock data with smooth curves. Needs to pull from `activity_logs` grouped by week/month.

2. **Leads by Stage donut** (`dashboard-charts.tsx`) — Shows "100 Total Leads" but the actual count is 1. Needs to pull from `leads` grouped by status.

### Existing API Endpoints Available for Widget Data

| Widget Data | Source | Exists? |
|------------|--------|---------|
| Lead counts, call counts | `/api/dashboard/stats` | Yes |
| Calendar events | `/api/dashboard/calendar` | Yes |
| Activity history | `/api/activity-log/history` | Yes |
| AI agent usage | `/api/agents/usage` | Yes |
| Usage/costs | `/api/settings/usage` | Yes |
| Unread messages | `lib/supabase/inbox.ts` | Yes (function) |
| Pipeline stages | `lib/supabase/dashboard.ts` | Yes |
| Commission settings | `lib/store/commission-store.ts` | Yes |
| Quote snapshots | `quotes` table | Yes (no dedicated widget endpoint) |

Most data is already queryable. New widgets should reuse existing endpoints where possible and only create new endpoints if absolutely necessary.

## 5. Memory

- Dashboard goals currently use localStorage — noted in the audit. Don't change this now, but the widget picker itself should NOT use localStorage. Use the existing `dashboard_layout` Supabase column.
- `dashboard_layout` column in `agent_settings` already exists. The GET/PUT routes exist at `/api/settings/dashboard-layout`.
- The dashboard stats endpoint (`/api/dashboard/stats`) runs 6 parallel Supabase queries. Adding more parallel queries is fine but be mindful of Supabase connection limits.
- Recharts is already a dependency and used in `dashboard-charts.tsx`. Use it for all chart widgets.
- The dnd-kit packages (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) are already installed.

## 6. Success Criteria

### Widget Picker
1. An "Edit Dashboard" or "Customize" button appears on the dashboard (top right area, near "New Quote" and "View Leads")
2. Clicking it opens a modal/sheet showing ALL available widgets with toggles (on/off) and current active ones highlighted
3. Toggling a widget off removes it from the dashboard immediately
4. Toggling a widget on adds it to the bottom of the dashboard
5. The picker shows widget name, a short description, and a category label
6. Changes persist to Supabase via the existing dashboard-layout endpoint
7. Closing the picker returns to normal drag-and-drop mode
8. New users get a sensible default set (not all 21 — maybe 8-10 most useful)

### Mock Data Fix
9. Activity Overview chart shows real data from activity_logs (grouped by week or month, last 3 months)
10. Leads by Stage donut shows real lead counts per pipeline stage

### New Widgets (11 total)
11. **Inbox Unread** — Shows unread SMS + email count with channel breakdown
12. **Avg Response Time** — Time from lead created to first contact (call, SMS, or email)
13. **Communication Breakdown** — Pie chart: calls vs SMS vs email this period
14. **AI Agent Summary** — AI calls handled, leads auto-created, pending callbacks
15. **AI Call Queue** — List of leads from AI calls needing human follow-up
16. **Commission Estimate** — Projected monthly commissions from pipeline
17. **Top Carriers** — Most quoted carriers this month (bar chart or ranked list)
18. **Quote-to-App Rate** — Conversion funnel: quotes → applications
19. **Calendar Preview** — Next 3-5 upcoming events
20. **Overdue Tasks** — Leads with past-due follow-ups (red urgency)
21. **Usage & Costs** — Call minutes, AI minutes, SMS count, estimated total cost

### General
22. `bunx tsc --noEmit` passes clean
23. `bun run build` succeeds
24. All existing widgets still work and display correctly
25. Dashboard drag-and-drop still works for all widgets (existing + new)

## 7. Dependencies

- Existing `agent_settings.dashboard_layout` column (already exists)
- Existing dashboard API routes (already exist)
- Existing `@dnd-kit` packages (already installed)
- Existing `recharts` package (already installed)
- All data sources listed in the Knowledge section

## 8. Failure Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Widget shows blank/error | API endpoint returns error | Each widget handles its own error state — show "Unable to load" with retry button, don't crash the dashboard |
| Layout doesn't save | dashboard-layout API fails | Toast error, keep current layout in memory |
| Chart renders empty | No data for time period | Show empty state message: "No data yet — start by creating leads and running quotes" |
| New widget breaks existing layout | dnd-kit ID conflict | Each widget must have a unique, stable ID (use kebab-case slugs like 'inbox-unread', 'ai-agent-summary') |
| Too many API calls on mount | 21 widgets each fetching data | Only active widgets fetch data. Hidden widgets don't mount. Consider batching related queries. |

## 9. Learning

- Document the widget registration pattern so future widgets can be added easily
- Track which widgets agents actually use (the layout data in Supabase tells you this passively)
- Note if any queries are slow — dashboard should feel instant
- The default widget set for new users should be reviewed after Max gives feedback

---

## Execution Plan

### Session 1: Widget Picker + Mock Data Fix

**Phase A: Widget Registry**
1. Create a widget registry file (`lib/data/dashboard-widgets.ts` or similar) that defines all 21 widgets:
```typescript
interface WidgetDefinition {
  id: string;           // 'total-leads', 'inbox-unread', etc.
  name: string;         // 'Total Leads', 'Inbox Unread'
  description: string;  // 'Track your total lead count and weekly growth'
  category: 'overview' | 'communication' | 'ai' | 'revenue' | 'calendar' | 'performance';
  defaultActive: boolean;  // included in new user's default layout
  size: 'small' | 'medium' | 'large';  // helps with grid placement
}
```

2. Register all 21 widgets (10 existing + 11 new) with their metadata.

**Phase B: Layout Schema Update**
1. Update the dashboard-layout GET/PUT to handle the active/hidden model
2. Migrate existing layout arrays to the new format (backward compatible — if old format detected, treat all as active)
3. Default layout for new users: Total Leads, Calls, Pipeline Distribution, Active Deals, Recent Activity, Follow-ups, Calendar Preview, Goals (8 widgets — not overwhelming)

**Phase C: Widget Picker UI**
1. Add "Customize" button to dashboard header
2. Build picker modal/sheet with:
   - Widgets grouped by category
   - Toggle switches for each widget (on = active, off = hidden)
   - Widget name + short description
   - "Reset to Default" button
3. Save on close (or auto-save on toggle)

**Phase D: Fix Mock Data**
1. Activity Overview chart — query `activity_logs` grouped by type and week for last 12 weeks
2. Leads by Stage donut — query `leads` grouped by `status`, use real pipeline stage counts

### Session 2: New Widgets (11)

**Phase E: Communication Widgets (3)**
1. Inbox Unread — query sms_logs + email_logs for unread counts
2. Avg Response Time — calculate from leads.created_at vs first activity_log entry per lead
3. Communication Breakdown — query call_logs + sms_logs + email_logs counts

**Phase F: AI Widgets (2)**
4. AI Agent Summary — from `/api/agents/usage` data
5. AI Call Queue — from ai_agent_calls where follow-up needed

**Phase G: Revenue Widgets (3)**
6. Commission Estimate — from commission store + pipeline stage conversion rates
7. Top Carriers — from quotes table, group by carrier, count
8. Quote-to-App Rate — from leads with status progression (quoted → applied)

**Phase H: Calendar & Tasks Widgets (2)**
9. Calendar Preview — from `/api/dashboard/calendar` (already exists)
10. Overdue Tasks — from leads where follow_up_date < now()

**Phase I: Usage Widget (1)**
11. Usage & Costs — from `/api/settings/usage`, show call minutes (human + AI), SMS count, estimated cost
