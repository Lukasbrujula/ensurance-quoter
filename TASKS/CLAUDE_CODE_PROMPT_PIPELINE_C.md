# Lead Pipeline C — Auto-Status Suggestions

## Context

Pipeline A added status stages, Pipeline B added follow-ups. This task adds smart suggestions: when an agent makes a call or runs a quote, the app suggests moving the lead to the appropriate pipeline stage. Suggestions only — never auto-change.

## Prerequisites

Pipeline A and B must be committed first.

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
cat lib/data/pipeline.ts                    # PIPELINE_STAGES
cat components/leads/status-badge.tsx        # StatusBadge from Pipeline A
cat lib/store/lead-store.ts | head -80
cat lib/store/call-store.ts | head -40
# Find where call logs are saved
grep -rn "call-log\|callLog\|call_log" app/api/ --include="*.ts" -l
# Find where quotes are saved/triggered
grep -rn "saveQuote\|quote.*save\|insertQuote" components/ lib/ app/ --include="*.ts" --include="*.tsx" -l
```

## Step 1 — After a call ends → suggest "Contacted"

Find where the call ends and call log is saved (likely in the call store or a post-call handler).

After a call is completed and the call log is saved, check the lead's current status. If it's 'new':
- Show a toast: "Move [Lead Name] to Contacted?" with [Yes] and [Dismiss] action buttons
- If "Yes": update status to 'contacted', persist to Supabase
- If "Dismiss" or ignored: do nothing

Only suggest if current status is 'new'. Don't suggest if already 'contacted' or further along.

Use Sonner's action toast:
```typescript
toast("Move to Contacted?", {
  description: `You just called ${leadName}`,
  action: {
    label: "Yes",
    onClick: () => updateLeadStatus(leadId, 'contacted'),
  },
  duration: 8000, // Give them time to see it
});
```

## Step 2 — After a quote is run → suggest "Quoted"

Find where quote results are returned/displayed.

After a successful quote (at least 1 carrier returned), check the lead's current status. If it's 'new' or 'contacted':
- Show a toast: "Move [Lead Name] to Quoted?" with [Yes] and [Dismiss]
- If "Yes": update status to 'quoted'

Only suggest if current status is earlier than 'quoted' in the pipeline.

## Step 3 — Helper: status progression check

Create a small utility:

```typescript
// lib/utils/pipeline.ts (or add to pipeline.ts)
const STATUS_ORDER = ['new', 'contacted', 'quoted', 'applied', 'issued', 'dead'];

export function shouldSuggestStatus(
  currentStatus: PipelineStatus,
  suggestedStatus: PipelineStatus
): boolean {
  if (suggestedStatus === 'dead') return false; // never auto-suggest dead
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  const suggestedIndex = STATUS_ORDER.indexOf(suggestedStatus);
  return suggestedIndex > currentIndex;
}
```

This prevents backward suggestions (if a lead is 'applied', don't suggest 'contacted' after a call).

## Step 4 — Verify

```bash
npx tsc --noEmit
bun run build
```

## Rules

- NEVER auto-change status — always suggest via toast with explicit action
- Only suggest forward movement in the pipeline (new → contacted → quoted → ...)
- Never suggest "dead" automatically
- Toast should be visible for 8 seconds (enough to notice but not annoying)
- Don't show suggestion if lead has no status yet (shouldn't happen with default 'new', but defensive check)
- If the agent dismisses or ignores, don't ask again for the same action
- Keep it simple: only two triggers (call completed, quote run). Don't over-engineer.
- Dark mode compatible toasts
