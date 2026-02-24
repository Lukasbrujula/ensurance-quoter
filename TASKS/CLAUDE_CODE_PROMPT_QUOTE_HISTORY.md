# Quote History — View Past Quotes on Lead Detail

## Context

The `quotes` table already exists in Supabase with `lead_id`, `request_data` (jsonb), and `response_data` (jsonb). Quotes are being saved when agents run them. But there's no UI to view past quotes for a lead. Agents need to pull up "what did I quote this client last week?" without re-running the quote.

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
cat lib/types/quote.ts                         # QuoteRequest, QuoteResponse types
grep -rn "quotes" lib/supabase/ --include="*.ts"  # how quotes are saved
cat components/quote/quote-workspace.tsx | head -40
cat app/leads/\[id\]/page.tsx                  # lead detail page structure
cat components/calling/call-log-viewer.tsx | head -40  # reference for expandable list pattern
```

## Step 1 — Create quote history data layer

Create `lib/supabase/quotes.ts` (or add to existing file):

```typescript
export async function getQuoteHistory(leadId: string): Promise<QuoteHistoryItem[]> {
  // Query quotes table for this lead, ordered by created_at DESC
  // Return: id, created_at, request summary (coverage, term, state), 
  //         response summary (carrier count, top carrier, best premium)
}
```

The function should extract summary info from the JSONB columns so the UI doesn't need to parse raw data:

```typescript
interface QuoteHistoryItem {
  id: string;
  created_at: string;
  // From request_data:
  coverage_amount: number;
  term_length: number;
  state: string;
  tobacco: boolean;
  medical_conditions: string[];
  // From response_data:
  total_carriers: number;
  eligible_carriers: number;
  top_carrier_name: string;
  top_carrier_premium: number;
  // Full data for expand:
  request_data: QuoteRequest;
  response_data: QuoteResponse;
}
```

## Step 2 — Create QuoteHistory component

Create `components/leads/quote-history.tsx`:

Shows a list of past quotes for the current lead. Each quote is a collapsible row.

**Collapsed view (one row per quote):**
```
┌──────────────────────────────────────────────────────────────┐
│ Feb 20, 2026 · $500K · 20yr Term · 8 carriers    [▼ Expand] │
│ Best: Foresters $42/mo                                       │
└──────────────────────────────────────────────────────────────┘
│ Feb 18, 2026 · $250K · 15yr Term · 11 carriers   [▼ Expand] │
│ Best: LGA/Banner $28/mo                                      │
└──────────────────────────────────────────────────────────────┘
```

**Expanded view (shows full results):**
```
┌──────────────────────────────────────────────────────────────┐
│ Feb 20, 2026 · $500K · 20yr Term                 [▲ Collapse]│
│                                                              │
│ Client: John D., 35M, TX, Non-tobacco                        │
│ Medical: Type 2 Diabetes                                     │
│                                                              │
│ Results (8 carriers):                                        │
│  1. Foresters Financial   $42/mo   Score: 92   ✓ Best Match  │
│  2. John Hancock          $48/mo   Score: 88                 │
│  3. SBLI                  $45/mo   Score: 85                 │
│  ...                                                         │
│                                                              │
│ [Re-run This Quote]  [Copy Summary]                          │
└──────────────────────────────────────────────────────────────┘
```

Key features:
- Most recent quote at top
- Collapsed by default (show last 5, "Show older" link for more)
- "Re-run This Quote" button: loads the saved request params back into the intake form and re-runs
- "Copy Summary" button: uses the existing quote-summary copy utility from the quote copy feature
- If medical conditions or tobacco were flagged, show small indicators
- Empty state if no quotes: "No quotes yet. Run a quote from the workspace above."

## Step 3 — Add to lead detail page

In the lead detail view, add a "Quote History" section. Look at how the existing page is structured — it likely has the QuoteWorkspace and CallLogViewer. Quote history should sit naturally alongside these.

Options (pick whichever fits the current layout best):
- A tab alongside call logs: "Calls" | "Quotes"
- A separate collapsible section below the workspace
- Part of the right panel if there's space

The call log viewer already has an expandable pattern — follow the same UI pattern for consistency.

## Step 4 — Wire "Re-run Quote" to intake form

When the agent clicks "Re-run This Quote":
1. Load the saved `request_data` into the lead store's intake data
2. Scroll/focus the intake form
3. Auto-trigger the quote (or just populate the form and let them click "Get Quotes")

This is the key workflow: client calls back 3 months later, agent pulls up last quote, re-runs with current rates.

## Step 5 — Auto-save quote to lead

Verify that when a quote is run from the lead detail workspace, it saves to the `quotes` table with the correct `lead_id`. If quotes are only being saved from `/quote` (the anonymous page), wire the lead detail workspace to also save.

Check:
```bash
grep -rn "quotes\|saveQuote\|insertQuote" components/quote/ lib/ app/api/ --include="*.ts" --include="*.tsx"
```

## Step 6 — Verify

```bash
npx tsc --noEmit
bun run build
```

## Rules

- Don't modify the quote engine or API — just read from the quotes table
- Follow the same expandable row pattern as the call log viewer for consistency
- Keep the collapsed row compact — it should scan easily with many quotes
- Date formatting: relative for recent ("2 hours ago", "Yesterday"), absolute for older ("Feb 18, 2026")
- The "Copy Summary" button should reuse the existing quote-summary utility — don't duplicate that logic
- Dark mode compatible
- Mobile-friendly: the expanded view should stack vertically on small screens
