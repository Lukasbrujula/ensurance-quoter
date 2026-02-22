# Task: P3-02-build-chart-integration

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

Wire the existing build chart (height/weight) data into the eligibility engine and intake form. Currently, 12 carriers have build chart data in the intelligence database but it's not used. Adding height/weight to the intake form lets the engine flag carriers where the client exceeds the height/weight limits for their best rate class.

## Research First

Before writing code, Claude Code should:
1. Read `lib/data/carriers.ts` to find where build chart data lives (it may be in a separate file or embedded in carrier objects)
2. Check `ensurance_intel_COMPLETE_v3_20260212.xlsx` in the project root for the build chart tab/sheet structure
3. Determine the data format: Is it height → max weight per rate class? Height/weight → rate class mapping?

The task steps below assume a typical format but may need adjustment based on actual data structure.

## Files to Create

### 1. `lib/data/build-charts.ts` (~200 lines, depends on data)
- Structured build chart data per carrier
- Format likely: `{ carrierId: string, gender: "Male" | "Female", entries: { heightInches: number, maxWeightByClass: { preferred: number, standard: number, decline: number } }[] }`
- Or simpler: `{ carrierId: string, entries: { heightInches: number, minWeight: number, maxWeight: number }[] }`
- Extract from Excel or carrier data — check what's already in the codebase

### 2. `lib/engine/build-chart.ts` (~40 lines)
```typescript
export interface BuildChartResult {
  isWithinLimits: boolean
  rateClassImpact?: string     // "May qualify for Preferred" or "Standard only" or "Decline"
  carrierNote?: string         // Any carrier-specific note
}

export function checkBuildChart(
  carrierId: string,
  gender: "Male" | "Female",
  heightFeet: number,
  heightInches: number,
  weight: number
): BuildChartResult
```
- Convert height to total inches internally
- Look up carrier's build chart
- Return whether client is within limits and any rate class impact
- If carrier has no build chart data, return `{ isWithinLimits: true }` (assume OK)

## Files to Modify

### 3. `lib/types/quote.ts`
- Add to `QuoteRequest`:
  - `heightFeet?: number` (3-7)
  - `heightInches?: number` (0-11)
  - `weight?: number` (50-500 lbs)

### 4. `components/quote/intake-form.tsx`
- Add Height/Weight section (collapsible, like medical history)
- Height: Two side-by-side inputs — feet (3-7) + inches (0-11)
- Weight: Single input in lbs
- Place after the tobacco section, before medical history
- Optional — form still works without it

### 5. `lib/engine/eligibility.ts`
- Add build chart check to `checkEligibility()` if height/weight provided
- If client exceeds carrier's build limits → `ineligibilityReason: "Exceeds height/weight limits"`
- If within limits but affects rate class → note in matched product or features

### 6. `lib/engine/match-scoring.ts`
- If build chart data available and client is within preferred limits → small bonus (+2)
- If client is in standard-only territory → no penalty (just no bonus)

### 7. `app/api/quote/route.ts`
- Add heightFeet, heightInches, weight to Zod schema (all optional)
- Pass through to eligibility engine

## UI Notes
- Height/weight is optional — many agents won't have this info at quote time
- Use compact layout: `5 ft 10 in | 185 lbs` on one row
- Show build chart results in carrier detail modal (Underwriting tab) if data exists
- Consider showing BMI calculation as helper text (BMI = weight × 703 / height²)

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. Height/weight fields appear in intake form
3. Entering height/weight filters carriers based on build chart limits
4. Carriers without build chart data are unaffected (assumed OK)
5. Build chart results show in carrier detail modal underwriting tab
6. Quote still works without height/weight (backward compatible)

## On Completion
- Update CLAUDE.md
- Commit: `feat: add build chart (height/weight) integration to eligibility engine`
