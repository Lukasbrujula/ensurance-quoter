# Final Expense Insurance Reference

## What It Is

Final Expense Insurance is a small whole life insurance policy designed to cover end-of-life costs:

- Funeral or cremation
- Burial plot
- Medical bills
- Credit card debt
- Small outstanding debts
- Leaving money to family

**Typical coverage:** $5,000–$50,000 (most common: $10,000–$25,000)

Unlike traditional life insurance, it is simplified, fast, and designed for older people who may have health issues.

---

## Who It's For

- **Age:** 50–85 (sometimes 45–90 depending on carrier)
- People who don't qualify for large life insurance policies
- People with health issues
- People who want to avoid leaving funeral costs to family
- People on fixed income (Social Security, pensions)

The average U.S. funeral costs $8,000–$15,000.

---

## Underwriting Categories

### 1. Level Benefit (Immediate Coverage)

Best product — full death benefit from day one.

- Requires answering health questions
- Must be relatively healthy
- If someone buys $20,000 and dies tomorrow, beneficiary receives $20,000 immediately

### 2. Graded Benefit

For people with moderate health issues. Partial payout in early years:

| Period | Payout |
|--------|--------|
| Year 1 | 30% of death benefit |
| Year 2 | 70% of death benefit |
| Year 3+ | 100% of death benefit |

**Example ($20,000 policy):**
- Death in Year 1 → $6,000
- Death in Year 2 → $14,000
- Death in Year 3+ → $20,000

Some carriers return premiums + interest instead of a percentage.

### 3. Guaranteed Issue

For people with serious health issues. No health questions — everyone qualifies.

**2-year waiting period:**

| Period | Payout |
|--------|--------|
| Years 1–2 | Premiums returned + interest (typically +10%) |
| Year 3+ | Full death benefit |

---

## Why People Buy It

1. **Funeral costs** — Funeral homes often require payment upfront, which families may not have
2. **Protecting family** — Seniors don't want children to raise money for burial
3. **Easy approval** — No medical exam, quick approval, designed for seniors with health conditions

---

## Typical Price Ranges

Prices depend on age, gender, smoking status, and health.

| Age | Coverage | Monthly Cost |
|-----|----------|-------------|
| 55 | $20,000 | $40–$70 |
| 65 | $20,000 | $60–$100 |
| 75 | $20,000 | $100–$160 |
| 80 | $15,000 | $130–$200 |

Policies are whole life:
- Price never increases
- Coverage never decreases
- Policy builds small cash value

---

## Sales Process

1. Customer fills out lead form
2. Agent calls them
3. Agent asks health questions
4. Quote engine determines eligibility
5. Agent recommends policy
6. Application submitted electronically
7. Approval in minutes or hours

---

## Quoting Requirements

### Inputs

- Age
- Gender
- State
- Smoking status
- Health conditions
- Coverage amount

### Outputs

1. Eligible carriers
2. Underwriting category (level vs graded vs guaranteed issue)
3. Monthly premium
4. Underwriting class

---

## Summary

Final expense insurance is small whole life insurance designed for seniors to cover funeral and end-of-life costs. Coverage is usually $5k–$50k, and policies are priced based on age and health. There are three underwriting types: immediate coverage (healthy), graded benefit (moderate health issues), and guaranteed issue (serious health issues). The quote tool needs to determine eligibility and price across carriers based on those categories.

---

## Implementation (2026-03-07)

### Compulife Integration

- **Category:** `NewCategory: "Y"` (GIWL - Graded Benefit Whole Life)
- **Health class:** Fixed to `"R"` (Standard) — FE is simplified issue, not underwritten PP/P/RP/R
- **Coverage range:** $5,000–$50,000 (10 steps: 5K, 10K, 15K, 20K, 25K, 30K, 35K, 40K, 45K, 50K)
- **Returns:** ~35 products across 35 companies; 16 currently mapped to our CARRIERS array
- **Mock fallback:** Disabled for FE — `CompulifeWithMockFallback` skips mock supplementation when `categoryOverride` is set

### Type Classification

Product type is determined from Compulife product names:

| Name contains | Classification |
|---|---|
| "guaranteed issue" or "guaranteed acceptance" | `guaranteed-issue` |
| "graded" | `graded` |
| Everything else | `level` |

Product names are stored on `CarrierQuote.compulifeProductName` and displayed in the UI.

### UI

- **Dedicated FE tab** in quote page (`productMode === "finalExpense"`)
- **Intake form:** Hides term duration buttons, ROP/UL/Table Rating/Compare Terms toggles
- **Coverage slider:** $5K–$50K with FE-specific steps (resets to $10K on tab switch)
- **Results:** Grouped by Level (green) / Graded (amber) / Guaranteed Issue (gray) with filter chips
- **Age warning:** Inline note when age < 45

### Key Files

| File | Role |
|---|---|
| `components/quote/intake-form.tsx` | FE-specific form controls, coverage steps |
| `components/quote/quote-workspace.tsx` | FE header, slider, product type legend |
| `components/quote/carrier-results.tsx` | FE type grouping, filter chips, product names |
| `app/api/quote/route.ts` | FE Compulife call, type classification, product name pass-through |
| `lib/engine/pricing-config.ts` | Skip mock supplementation for specialized categories |
