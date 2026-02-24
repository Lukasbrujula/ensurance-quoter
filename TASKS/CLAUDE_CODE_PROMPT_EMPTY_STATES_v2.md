# Empty States

## Context

Every page has a "zero state" when the agent first logs in — no leads, no call history, no quotes. Replace empty/blank states with inviting messages that guide the agent to their first action.

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
# Find existing empty state patterns
grep -rn "length === 0\|\.length === 0\|No leads\|no results\|No calls\|No quotes" components/ --include="*.tsx" -l
grep -rn "empty\|nothing\|no data" components/ --include="*.tsx" -l
```

## Step 1 — Create reusable EmptyState component

Create `components/shared/empty-state.tsx`:

```typescript
interface EmptyStateProps {
  icon: React.ReactNode        // Lucide icon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  compact?: boolean            // Smaller version for panels
}
```

Design:
- Centered in container
- Icon: 48px with soft bg-muted rounded-full p-3 circle behind it
- Title: text-lg font-semibold
- Description: text-sm text-muted-foreground, max-w-sm centered
- Action: Button component
- Secondary: text link
- Compact: 32px icon, tighter spacing

## Step 2 — Apply everywhere

Find every empty state in the app and replace with EmptyState component:

**Leads page (no leads):**
- Icon: Users | Title: "No leads yet" | Desc: "Add your first client to start quoting and tracking your pipeline." | Action: "Add a Lead" | Secondary: "Import from CSV"

**Quote results (not run yet):**
- Icon: Search | Title: "Ready to find the best match" | Desc: "Fill out the client details on the left and we'll find the top carriers instantly."

**Quote results (0 results):**
- Icon: AlertCircle | Title: "No carriers available" | Desc: "No carriers match this profile. Try adjusting coverage or term length."

**Call log viewer (no calls):**
- Icon: Phone | Title: "No calls yet" | Desc: "Start a call to get AI coaching and automatic transcription." | Compact: true

**AI panel — Chat mode (no messages):**
- Icon: MessageSquare | Title: "Your AI assistant" | Desc: "Ask about carrier rules, underwriting guidelines, or get help with a case." | Compact: true

**AI panel — Call mode (no active call):**
- Icon: Headphones | Title: "Coaching starts when you call" | Desc: "During a live call, you'll see real-time coaching cards with personality insights and medication alerts." | Compact: true

**Dashboard (no activity):**
- Icon: LayoutDashboard | Title: "Welcome to Ensurance" | Desc: "Your activity will show up here." | Action: "Run Your First Quote" (href /quote) | Secondary: "Import Leads" (href /leads)

## Step 3 — Verify

```bash
npx tsc --noEmit
bun run build
```

## Rules

- ONE reusable component for all empty states
- Lucide icons only — no images or illustrations
- Semantic color tokens (dark mode compatible)
- Don't change any logic — only swap what renders when data is empty
- One sentence descriptions max
- Compact variant for panels/sidebars
