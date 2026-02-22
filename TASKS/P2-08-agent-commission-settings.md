# Task: P2-08-agent-commission-settings

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: Verify commission column calculates correctly in quote results

## Description

Add per-carrier commission settings so agents can input their negotiated commission rates and see estimated earnings directly in the quote results. Life insurance commissions are a percentage of the annual premium — each agent has different rates per carrier based on their contracts with BGAs/IMOs/carriers. This feature lets agents compare not just which carrier is cheapest for the client, but which quote earns them the most money.

## Background: How Life Insurance Commissions Work

- **First Year Commission**: Percentage of the first year's annual premium. Typically 50-110% for term life. This is the agent's primary income from a sale.
- **Renewal Commission**: Percentage of annual premium in years 2+. Typically 2-10% for term life. Paid as long as the policy stays in force (varies by carrier, often 2-10 years).
- Each agent negotiates their own rates per carrier (or their BGA/agency sets them).
- Commissions are built into the premium — the client pays the same price regardless.
- Example: $500K term policy, $600/year premium, 80% first-year commission = agent earns $480 on the sale.

## Files to Create

### 1. `lib/types/commission.ts` (~25 lines)
```typescript
export interface CarrierCommission {
  carrierId: string
  carrierName: string        // For display
  firstYearPercent: number   // 0-150 (percentage of annual premium)
  renewalPercent: number     // 0-20 (percentage of annual premium)
}

export interface CommissionSettings {
  commissions: CarrierCommission[]
  defaultFirstYearPercent: number   // Fallback for carriers not explicitly set (e.g., 70)
  defaultRenewalPercent: number     // Fallback (e.g., 5)
}

export interface CommissionEstimate {
  firstYear: number          // Dollar amount
  renewal: number            // Dollar amount per year
  fiveYearTotal: number      // firstYear + (renewal × 4)
}
```

### 2. `lib/store/commission-store.ts` (~60 lines)
- Zustand store for commission settings
- State: `commissions: CarrierCommission[]`, `defaultFirstYearPercent`, `defaultRenewalPercent`
- Actions:
  - `setCarrierCommission(carrierId, firstYear, renewal)` — upsert
  - `removeCarrierCommission(carrierId)` — remove override, falls back to default
  - `getCommission(carrierId)` → returns carrier-specific or default rates
  - `setDefaults(firstYear, renewal)` — update default rates
- Persist to localStorage so settings survive page reloads
- Initialize with sensible defaults: 75% first year, 5% renewal
- Load carrier list from existing `carriers.ts` data

### 3. `lib/engine/commission-calc.ts` (~30 lines)
- `calculateCommission(annualPremium, firstYearPercent, renewalPercent): CommissionEstimate`
  - `firstYear = annualPremium × (firstYearPercent / 100)`
  - `renewal = annualPremium × (renewalPercent / 100)`
  - `fiveYearTotal = firstYear + (renewal × 4)`
- Pure function, no side effects
- Handles edge cases: zero premium, zero commission, undefined values

### 4. `app/settings/page.tsx` (~20 lines)
- Server component wrapper
- Metadata: title "Commission Settings"
- Renders `<CommissionSettingsClient />`

### 5. `app/settings/layout.tsx` (~15 lines)
- Settings layout with breadcrumb back to dashboard/leads
- Clean single-column centered layout (max-w-3xl)

### 6. `components/settings/commission-settings-client.tsx` (~200 lines)
Main settings page with two sections:

**Section A: Default Commission Rates**
- Two input fields: "Default First Year %" and "Default Renewal %"
- Helper text: "Applied to carriers without specific rates set below"
- Save button (or auto-save on blur)

**Section B: Per-Carrier Commission Table**
- Table with columns: Carrier Name | AM Best | First Year % | Renewal % | Actions
- Pre-populated rows for all 11 intelligence carriers from `carriers.ts`
- Each row has inline editable number inputs for first year and renewal percentages
- Empty/unset rows show placeholder with default value in gray
- "Reset to Default" button per row to clear carrier-specific override
- Visual indicator (dot or badge) showing which carriers have custom rates vs defaults
- Sort by carrier name alphabetically
- Note at bottom: "Commission rates are stored locally and not shared. When Compulife carriers are added, they'll use your default rates unless you set specific ones."

### 7. `components/settings/commission-table-row.tsx` (~50 lines)
- Single row component for the carrier commission table
- Carrier name + AM Best rating on left
- Two number inputs (first year %, renewal %) with min/max validation
- "Custom" badge if carrier has specific rates
- Reset button to clear override
- Debounced save (300ms after typing stops)

## Files to Modify

### 8. `lib/types/index.ts`
- Add barrel exports for commission types

### 9. `components/quote/carrier-results.tsx` (or wherever the quote results table lives)
- Import `useCommissionStore` and `calculateCommission`
- For each carrier quote result, calculate commission estimate
- Update the existing "Commission" column:
  - Show first-year commission as dollar amount: "$480"
  - Tooltip or secondary text showing: "80% FY / 5% Renewal"
  - If commission settings are all defaults, show lighter styling with note "Set your rates in Settings"
- Add sort option: "Sort by Commission (highest first)"

### 10. `components/quote/carrier-card.tsx` (if carrier cards exist in results)
- Show commission estimate in the card if space allows
- Small text: "Est. commission: $480 FY"

### 11. Navigation — add Settings link
- Add "Settings" or gear icon to the main navigation (TopNav or sidebar)
- Route: `/settings`
- Icon: Settings/Gear from Lucide

### 12. `components/quote/carrier-detail-modal.tsx`
- In the Pricing tab, add a "Your Commission" section:
  - First Year: $X (Y%)
  - Annual Renewal: $X (Y%)
  - 5-Year Total: $X
- Only shows if commission rates are set (not zero)

## Commission Calculation in Quote Results

```typescript
// In carrier-results.tsx or wherever quotes are rendered:
const commissionStore = useCommissionStore()

// For each carrier quote:
const { firstYearPercent, renewalPercent } = commissionStore.getCommission(carrier.id)
const annualPremium = quote.monthlyPremium * 12
const commission = calculateCommission(annualPremium, firstYearPercent, renewalPercent)

// Display:
// commission.firstYear → "$480" (main display)
// commission.renewal → "$30/yr" (secondary)
// commission.fiveYearTotal → "$600 over 5yr" (tooltip or detail modal)
```

## UI Design Notes

- Settings page should feel clean and professional — it's where agents manage money
- Use shadcn Table component for the carrier commission grid
- Number inputs should be compact (w-20 or so) with % suffix
- Use shadcn Tooltip for additional info (hover over commission in results to see breakdown)
- Mobile: commission table stacks carrier name above the two inputs
- The commission column in quote results should highlight the highest commission in green (same pattern as "Best Value" for price)
- Consider adding a "Highest Commission" sort option alongside existing sorts

## Persistence Strategy

- **For now**: localStorage via Zustand persist middleware
- **Future (post-auth)**: Migrate to Supabase `agent_settings` table with user_id FK
- The store should be designed so swapping localStorage → Supabase is straightforward
- Commission data is agent-specific, never shared between users

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. Settings page renders with all 11 carriers in the commission table
3. Changing a carrier's commission % persists across page reloads
4. Quote results show calculated commission in the Commission column
5. Commission updates live when settings are changed (no page reload needed)
6. Default rates apply to carriers without specific overrides
7. Carrier detail modal shows commission breakdown
8. Settings link accessible from main navigation

## Acceptance Criteria
- [ ] Commission types defined and exported
- [ ] Zustand store with localStorage persistence
- [ ] Commission calculator pure function
- [ ] Settings page with default rates + per-carrier table
- [ ] Quote results commission column shows dollar amounts
- [ ] Carrier detail modal shows commission breakdown
- [ ] Navigation includes Settings link
- [ ] Responsive on mobile
- [ ] No TypeScript errors

## Notes
- The commission column currently exists in the quote results but shows empty/placeholder. This task fills it with real calculated values.
- When Compulife is integrated and returns carriers we don't have intelligence data for, those carriers will use the default commission rates automatically.
- Commission percentages can exceed 100% (some carriers offer 110%+ first year for certain products). Input validation should allow 0-150% for first year and 0-25% for renewal.
- Don't store commission data in Supabase yet — localStorage is fine for MVP. The migration to DB happens when auth is implemented.
- The "5-year total" calculation assumes the policy stays in force for 5 years with level premiums, which is a simplification but useful for comparison.

## On Completion
- Mark this file as verified
- Update CLAUDE.md with new routes and components
- Commit with message: `feat: add agent commission settings and quote result integration`
