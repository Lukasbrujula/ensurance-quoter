# Compulife E2E Quote Test Results

**Run:** 2026-03-12T00:06:53.185Z
**Provider:** compulife
**Carriers in system:** 84

## Test 1 — Standard Term: 35M Non-Smoker, TX, $500K, 20yr

- Compulife call: 5769ms
- Health class: P
- Raw results: 74 products from 35 Compulife carriers
- Eligible carriers (our 38): 29
- Compulife-sourced: 29
- Non-Compulife: 0 (all Compulife)

### Top 3 cheapest

| # | Carrier | Monthly | Annual | Score | Source | Risk Class |
|---|---------|---------|--------|-------|--------|------------|
| 1 | AIG / American General * | $24.92 | $294.95 | 96 | compulife | Preferred Non-Tobacco |
| 2 | LGA / Banner Life | $25.04 | $294.64 | 95 | compulife | Preferred Non-Tobacco |
| 3 | Protective Life | $25.05 | $294.73 | 89 | compulife | Preferred Non-Tobacco |

## Test 2 — Final Expense: 65M Non-Smoker, TX, $15K

- Compulife call: 539ms
- Category: Y (Final Expense)
- Raw results: 17 products
- Product types: Level=6, Graded=8, Guaranteed Issue=3
- Mapped to our carriers: 17 of 17
- All Compulife-sourced: YES

### Top 3 cheapest FE

| # | Carrier | Product | Monthly | Type | Source |
|---|---------|---------|---------|------|--------|
| 1 | Mutual of Omaha | Living Promise Whole Life Insurance | $98.31 | level | compulife |
| 2 | Fidelity Life Association | RAPIDecision Senior Life Graded W/L | $116.92 | graded | compulife |
| 3 | Gerber Life | Guaranteed Life | $121.36 | level | compulife |

### All FE products

| Carrier | Product | Monthly | Type | Mapped? |
|---------|---------|---------|------|---------|
| Mutual of Omaha | Living Promise Whole Life Insurance | $98.31 | level | YES |
| Fidelity Life Association | RAPIDecision Senior Life Graded W/L | $116.92 | graded | YES |
| Gerber Life | Guaranteed Life | $121.36 | level | YES |
| Guarantee Trust Life | Heritage Life - Graded Benfit Whole Life | $123.25 | graded | YES |
| Fidelity Life Association | RAPIDecision Guaranteed Issue Graded W/L | $127.82 | guaranteed-issue | YES |
| Baltimore Life | Silver Guard II - Graded Benefit W/L | $127.98 | graded | YES |
| Foresters Financial | Planright Basic | $134.41 | level | YES |
| Transamerica | Transamerica Graded FE Express Solution | $138.16 | graded | YES |
| AIG / American General | Guaranteed Issue Whole Life (GIWL) | $140.27 | guaranteed-issue | YES |
| NLG/LSW (National Life) | Legacy Select Modified Benefit W/L | $145.35 | level | YES |
| Americo | EagleSelect 3 - Graded Death Benefit | $145.90 | graded | YES |
| United Home Life | Express Issue Whole Life - SI Graded | $151.40 | graded | YES |
| Fidelity Life Association | Senior Security Graded Benefit W/L | $155.73 | graded | YES |
| SBLI | Living Legacy - Final Expense Modified | $160.19 | level | YES |
| BetterLife | Graded Benefit Whole Life | $163.21 | graded | YES |
| United Home Life | Guaranteed Issue Whole Life Insurance | $187.68 | guaranteed-issue | YES |
| Transamerica | 2021 Easy Solution | $194.00 | level | YES |

## Test 3 — Vaper: 30M Vaper, TX, $500K, 20yr

- Dual Compulife calls: 1181ms
- Smoker results: 64 products (38 carriers)
- Non-smoker results: 71 products (36 carriers)
- Carriers with NON-SMOKER rates for vaping: 1
- Carriers with SMOKER rates for vaping: 30

### Carriers giving NON-SMOKER rates for vaping

- **Foresters Financial**: "NON-SMOKER rates on YourTerm"

### Foresters vape-friendly check

- Foresters classification: **NON-SMOKER**
- Foresters price: **$29.75/mo** ($340.00/yr)
- Risk class: Preferred Non-Tobacco
- Match score: 99

### Pricing comparison

| | Carrier | Monthly | Rate Type |
|---|---------|---------|-----------|
| Foresters | Foresters Financial | $29.75 | NON-SMOKER (vape-friendly) |
| Cheapest smoker | Illinois Mutual | $80.08 | SMOKER |
| Median smoker | Equitable Financial Life Insurance | $102.20 | SMOKER |

- Savings vs cheapest smoker: **63%**
- Savings vs median smoker: **71%**
- **Non-smoker rate confirmed: YES**

### Top 10 by price

| # | Carrier | Monthly | Rate Type | Score | Risk Class |
|---|---------|---------|-----------|-------|------------|
| 1 | Foresters Financial * | $29.75 | NON-SMOKER | 99 | Preferred Non-Tobacco |
| 2 | Illinois Mutual | $80.08 | SMOKER | 91 | Standard Tobacco |
| 3 | AIG / American General | $82.38 | SMOKER | 88 | Standard Tobacco |
| 4 | LGA / Banner Life | $82.85 | SMOKER | 89 | Standard Tobacco |
| 5 | Symetra Life | $82.86 | SMOKER | 86 | Standard Nicotine |
| 6 | Penn Mutual | $83.33 | SMOKER | 89 | Standard Tobacco |
| 7 | GBU Financial Life | $86.40 | SMOKER | 82 | Standard Tobacco |
| 8 | Thrivent Financial for Lutherans | $89.01 | SMOKER | 91 | Standard Tobacco |
| 9 | Pacific Life | $89.25 | SMOKER | 91 | Standard Tobacco |
| 10 | Ameritas Life Insurance Corp | $91.09 | SMOKER | 88 | Standard Tobacco |
