# Lead Pipeline B — Follow-Up Picker + Dashboard Follow-Ups

## Context

Pipeline A added status stages to leads. This task adds the follow-up date system: a picker component, a column in the table, and an "Upcoming Follow-ups" section on the dashboard. The `follow_up_date` and `follow_up_note` columns already exist from Pipeline A's migration.

## Prerequisites

Pipeline A must be committed first (status column, StatusBadge, PIPELINE_STAGES constants).

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
cat lib/data/pipeline.ts                       # PIPELINE_STAGES from Pipeline A
cat components/leads/lead-table.tsx            # table with status column from Pipeline A
cat components/leads/lead-details-section.tsx   # lead detail header
cat app/dashboard/page.tsx                      # dashboard page
cat lib/store/lead-store.ts | head -60
```

## Step 1 — FollowUpPicker component

Create `components/leads/follow-up-picker.tsx`:

A compact inline element that shows the follow-up status and lets agents set/change it.

**Display states:**
- No follow-up: subtle text "Set follow-up" with a small calendar icon
- Future follow-up: "Follow up: Tomorrow at 2:00 PM" in normal text
- Overdue follow-up: "Overdue: Feb 20 at 9:00 AM" in amber/red text
- Today: "Today at 3:00 PM" highlighted

**Click to open popover with:**

Quick presets (most important — agents want speed):
- "In 1 hour"
- "Tomorrow 9:00 AM"
- "Tomorrow 2:00 PM"
- "Next Monday 9:00 AM"
- "Next Friday 9:00 AM"

Custom section below presets:
- Date picker (shadcn Calendar)
- Time input (simple select with 30-min intervals: 8:00, 8:30, 9:00... 6:00 PM)
- Note field (single line Input, placeholder "e.g., Discuss term options")

Actions:
- "Save" — saves date + note to Supabase
- "Clear" — removes follow-up (only shows if follow-up exists)

On save: toast "Follow-up set for [date]"

## Step 2 — Add follow-up column to lead table

In `components/leads/lead-table.tsx`:

Add a "Follow-up" column:
- Shows the follow-up date if set (compact format: "Tomorrow 2pm", "Mon 9am", "Feb 28")
- Overdue dates shown in amber/red
- Empty cell shows a subtle "+" or calendar icon to set one
- Clicking opens the FollowUpPicker popover
- Sortable by follow-up date

Add a follow-up filter option:
- "Overdue" — follow_up_date < now
- "Today" — follow_up_date is today
- "This week" — follow_up_date within 7 days
- "All" — no filter (default)

## Step 3 — Show follow-up on lead detail

In the lead detail header (near the StatusBadge from Pipeline A):

Show the FollowUpPicker component. It should be visible and easy to access — agents will set follow-ups from the detail page after calls.

## Step 4 — Dashboard: Upcoming Follow-ups section

On the dashboard page, add an "Upcoming Follow-ups" section:

```
┌─────────────────────────────────────────────────┐
│ 📅 Upcoming Follow-ups                          │
├─────────────────────────────────────────────────┤
│ 🔴 OVERDUE · John Smith · Feb 20, 9:00 AM      │
│    "Discuss term length options"      [Quoted]   │
│                                                  │
│ 🟡 TODAY · Maria Garcia · 3:00 PM               │
│    "Send comparison sheet"          [Contacted]  │
│                                                  │
│ ⚪ Tomorrow · Bob Wilson · 9:00 AM               │
│    No note                              [New]    │
│                                                  │
│ ⚪ Mon, Feb 24 · Sarah Lee · 2:00 PM            │
│                                      [Quoted]    │
└─────────────────────────────────────────────────┘
```

- Query leads with follow_up_date in the next 7 days + any overdue
- Sort: overdue first (red), then today (amber), then upcoming (neutral)
- Each row: lead name, date/time, note (if any), status badge
- Click row → navigate to lead detail
- Max 10 items, "View all" link if more
- Overdue items highlighted (red/amber left border or icon)

Data query:
```typescript
// Fetch leads with upcoming or overdue follow-ups
const followUps = await supabase
  .from('leads')
  .select('id, name, status, follow_up_date, follow_up_note')
  .not('follow_up_date', 'is', null)
  .gte('follow_up_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // include 1 day overdue
  .order('follow_up_date', { ascending: true })
  .limit(10);
```

Actually, for overdue, you want ALL overdue (not just 1 day). Adjust:
```typescript
// Get overdue + next 7 days
.or(`follow_up_date.lt.${now},follow_up_date.lt.${sevenDaysFromNow}`)
```

Keep the query simple — fetch leads where follow_up_date is not null, sort by date, and categorize in the UI.

## Step 5 — Verify

```bash
npx tsc --noEmit
bun run build
```

## Rules

- Quick presets are the priority UX — agents should set a follow-up in 2 clicks, not navigate a calendar
- Dates display in agent's local timezone
- Overdue follow-ups must be visually distinct (can't miss them)
- The dashboard section should work even if there are 0 follow-ups (use EmptyState if it exists, or a simple "No upcoming follow-ups" message)
- Don't modify Pipeline A components (StatusBadge, filters) — build alongside them
- Dark mode compatible
- Don't build auto-status suggestions — that's Pipeline C
