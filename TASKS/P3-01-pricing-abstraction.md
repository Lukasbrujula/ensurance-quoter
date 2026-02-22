# Task: P3-01-pricing-abstraction

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: None

## Description

Create a pricing provider abstraction so the quote engine calls a clean interface instead of `mock-pricing.ts` directly. When Compulife arrives, we add a new provider implementation and flip a config — no changes to the quote API route, carrier results, or any UI code.

## Files to Create

### 1. `lib/engine/pricing.ts` (~50 lines)
```typescript
export interface PricingRequest {
  age: number
  gender: "Male" | "Female"
  state: string
  coverageAmount: number
  termLength: number
  tobaccoStatus: "non-smoker" | "smoker"
}

export interface PricingResult {
  carrierId: string
  carrierName: string
  productName: string
  monthlyPremium: number
  annualPremium: number
  riskClass?: string          // From Compulife: "Preferred Plus", "Standard", etc.
  source: "mock" | "compulife" // Track where the price came from
}

export interface PricingProvider {
  name: string
  getQuotes(request: PricingRequest): Promise<PricingResult[]>
}
```

### 2. `lib/engine/mock-provider.ts` (~30 lines)
- Implements `PricingProvider`
- Wraps existing `mock-pricing.ts` logic
- Maps existing output to `PricingResult[]` format
- `source: "mock"` on all results

### 3. `lib/engine/pricing-config.ts` (~15 lines)
```typescript
import { MockPricingProvider } from "./mock-provider"
import type { PricingProvider } from "./pricing"

// Swap this to CompulifePricingProvider when ready
export const pricingProvider: PricingProvider = new MockPricingProvider()
```

## Files to Modify

### 4. `app/api/quote/route.ts`
- Import `pricingProvider` from `pricing-config.ts` instead of calling mock-pricing directly
- Map `PricingResult[]` into existing `CarrierQuote[]` flow (merge with eligibility + match scoring)
- The rest of the route stays the same

### 5. `lib/engine/mock-pricing.ts`
- Keep as-is (don't break it), but it's now called through the provider wrapper
- Add comment at top: `// Wrapped by mock-provider.ts — direct usage deprecated`

## Key Design Decisions

- **Provider returns carrier-agnostic results**: The provider doesn't know about our intelligence data. It just returns prices. The quote route merges prices with eligibility/scoring.
- **Compulife will return more carriers**: Mock returns only our 11 intelligence carriers. Compulife will return 50+. The quote route must handle carriers that exist in pricing but not in `carriers.ts` — those get price but no intelligence data.
- **Async interface**: Even though mock is synchronous, the interface is async because Compulife will be an HTTP call.
- **Source tracking**: Each result has `source: "mock" | "compulife"` so we can show a badge or disclaimer on mock-priced results.

## Future: Adding Compulife

When Compulife API is ready, the steps will be:
1. Create `lib/engine/compulife-provider.ts` implementing `PricingProvider`
2. Change one line in `pricing-config.ts`: `export const pricingProvider = new CompulifePricingProvider()`
3. Done. No UI changes, no route changes, no type changes.

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. Quote API returns same results as before (mock pricing still active)
3. `pricing-config.ts` is the single point where provider is selected
4. Adding a new provider requires only implementing the interface + changing config
5. No changes to carrier-results.tsx, carrier-detail-modal.tsx, or any UI code

## On Completion
- Update CLAUDE.md with new engine files
- Commit: `refactor: add pricing provider abstraction for Compulife swap`
