# Compulife Pipeline Verification Results

**Date:** 2026-03-13
**Total Tests:** 17 | **Passed:** 17 | **Failed:** 0
**Verdict:** ALL PASS

---

## Test Group 1 — Term Life (Category 3-7)

### 1A: 35M non-smoker, TX, $500K, 20yr — baseline
- **Result:** PASS
- **Details:** 35 unique carriers, 74 products, all Compulife: true
- **Carrier Count:** 35
- **Category Code:** 5 (20yr term)
- **State Code:** 44 (TX)
- **Top 3 (cheapest):**
  - American General Life Insurance Company (aig): $24.92/mo ($294.95/yr) [AMGEATRG]
  - Banner Life Insurance Company (lga): $25.04/mo ($294.64/yr) [BANNBONS]
  - Symetra Life Insurance Company (symetra): $25.05/mo ($294.66/yr) [SYMESWME]

### 1B: 35M non-smoker, NY, $500K, 20yr — NY state filtering
- **Result:** PASS
- **Details:** 19 carriers from Compulife. Pricing-level NY exclusion violations: [none]. Eligibility-level violations: [none]
- **Carrier Count:** 19
- **Category Code:** 5 (20yr term)
- **State Code:** 33 (NY)
- **Top 3 (cheapest):**
  - William Penn Life Insurance Co of NY (williampenn): $25.91/mo ($304.84/yr) [WILPWOLR]
  - Protective Life and Annuity Insurance Co (protective): $26.15/mo ($307.59/yr) [PROAPRAT]
  - Penn Insurance and Annuity Co of NY (pennmutual): $26.29/mo ($305.65/yr) [PENIPINC]

### 1C: 35M smoker, TX, $500K, 20yr — tobacco pricing
- **Result:** PASS
- **Details:** 38 carriers, 65 products
- **Carrier Count:** 38
- **Category Code:** 5 (20yr term)
- **State Code:** 44 (TX)
- **Health Code:** R (smoker → Standard)
- **Top 3 (cheapest):**
  - Illinois Mutual Life Insurance Company (illinoismutual): $107.36/mo ($1220.00/yr) [ILLIILLI]
  - Guardian Life Insurance Co of America (guardian): $108.57/mo ($1265.00/yr) [GUARGUAR]
  - Penn Mutual Life Insurance Company (pennmutual): $108.77/mo ($1264.75/yr) [PENNPMNC]

### 1D: 35M non-smoker, TX, $500K, 10yr vs 30yr — category 3 vs 7
- **Result:** PASS
- **Details:** 10yr: 69 products (avg $21.66/mo, cat 3), 30yr: 72 products (avg $51.14/mo, cat 7). 30yr > 10yr: true
- **10yr Top 3:**
  - American General Life Insurance Company: $16.90/mo
  - Symetra Life Insurance Company: $16.99/mo
  - Transamerica Life Insurance Company: $17.00/mo
- **30yr Top 3:**
  - Transamerica Life Insurance Company: $39.53/mo
  - Banner Life Insurance Company: $39.92/mo
  - Symetra Life Insurance Company: $39.93/mo

### 1E: 50M non-smoker, TX, $500K, 20yr — older age
- **Result:** PASS
- **Details:** 35 carriers, 74 products
- **Carrier Count:** 35
- **Category Code:** 5 (20yr term)
- **State Code:** 44 (TX)
- **Top 3 (cheapest):**
  - Transamerica Life Insurance Company (transamerica): $77.35/mo ($910.00/yr) [TRANTRNA]
  - Thrivent Financial for Lutherans (thrivent): $78.69/mo ($915.00/yr) [THRITHCS]
  - Thrivent Financial for Lutherans (thrivent): $80.41/mo ($935.00/yr) [THRITHES]

## Test Group 2 — Final Expense (Category Y)

### 2A: 65M non-smoker, TX, $15K, FE — baseline
- **Result:** PASS
- **Details:** 17 FE products, 13 carriers. Level: 6, Graded: 8, GI: 3
- **Carrier Count:** 13
- **Category Code:** Y (Final Expense)
- **State Code:** 44 (TX)
- **Health Code:** R (FE Standard override)
- **Top 3 (cheapest):**
  - United of Omaha Life Insurance Company (moo): $98.31/mo ($1104.60/yr) [UTOMUTOM]
  - Fidelity Life Association (fidelitylife): $116.92/mo ($1343.90/yr) [FIDLFISL]
  - Gerber Life Insurance Company (gerber): $121.36/mo ($1456.40/yr) [GERBGERB]
- **FE Type Breakdown:** Level: 6, Graded: 8, GI: 3

### 2B: 65M non-smoker, NY, $15K, FE — NY uses state code 52
- **Result:** PASS
- **Details:** 2 FE products in NY, 2 carriers
- **Carrier Count:** 2
- **Category Code:** Y (Final Expense)
- **State Code:** 52 (NY Non-Business)
- **Health Code:** R (FE Standard override)
- **Top 3 (cheapest):**
  - Gerber Life Insurance Company (gerber): $121.36/mo ($1456.40/yr) [GERBGERB]
  - Independent Order of Foresters (foresters): $134.41/mo ($1536.15/yr) [INDEIONE]

### 2C: 70F non-smoker, TX, $10K, FE — different age/gender/amount
- **Result:** PASS
- **Details:** 17 FE products, 13 carriers
- **Carrier Count:** 13
- **Category Code:** Y (Final Expense)
- **State Code:** 44 (TX)
- **Health Code:** R (FE Standard override)
- **Top 3 (cheapest):**
  - United of Omaha Life Insurance Company (moo): $60.16/mo ($676.00/yr) [UTOMUTOM]
  - Fidelity Life Association (fidelitylife): $68.45/mo ($786.80/yr) [FIDLFISL]
  - Gerber Life Insurance Company (gerber): $73.33/mo ($880.00/yr) [GERBGERB]

## Test Group 3 — Simplified Issue (PRODDIS Filtering)

### 3A: 35M non-smoker, TX, $500K, 20yr, SI only
- **Result:** PASS
- **Details:** 4 SI carriers, 5 SI products
- **Carrier Count:** 4
- **Category Code:** 5 (20yr term)
- **Health Code:** R (SI override to Standard)
- **Top 3 (cheapest):**
  - Fidelity Life Association (fidelitylife): $54.81/mo ($630.00/yr) [FIDLFLIM]
  - Fidelity Life Association (fidelitylife): $58.73/mo ($675.00/yr) [FIDLFLHM]
  - Life Insurance Company of the Southwest (nlg): $81.40/mo ($925.00/yr) [LISWLIXW]
- **Products:**
  - Fidelity Life Association: SI - InstaTerm - 20 Year [FIDLFLIM]
  - Fidelity Life Association: Rapid Decision Life - 20 Year Term [FIDLFLHM]
  - Life Insurance Company of the Southwest: 20-Year Term  (Express) [LISWLIXW]
  - Savings Bank Mutual Life Ins Co of MA: SI - EasyTrak Digital Term 20 - 20 Year [SAVESEVE]
  - Independent Order of Foresters: SI - Strong Foundation - 20 Year [INDEIOSI]

### 3B: 35M non-smoker, TX, $500K, 20yr, FUW only
- **Result:** PASS
- **Details:** 35 FUW carriers, 74 FUW products
- **Carrier Count:** 35
- **Category Code:** 5 (20yr term, PRODDIS excludes SI codes)
- **Top 3 (cheapest):**
  - American General Life Insurance Company (aig): $24.92/mo ($294.95/yr) [AMGEATRG]
  - Banner Life Insurance Company (lga): $25.04/mo ($294.64/yr) [BANNBONS]
  - Symetra Life Insurance Company (symetra): $25.05/mo ($294.66/yr) [SYMESWME]

### 3C: SI + FUW vs All comparison
- **Result:** PASS
- **Details:** All: 35, SI: 4, FUW: 35, SI+FUW: 39, ratio: 1.11

## Test Group 4 — COMPINC Carrier Filtering

### 4A: COMPINC=INDE,TRAN,BANN — 3 carriers only
- **Result:** PASS
- **Details:** Returned: [lga, transamerica, foresters]. Expected: [foresters, transamerica, lga]. Unexpected: [none]
- **Carrier Count:** 3

### 4B: COMPINC=INDE — single carrier (Foresters)
- **Result:** PASS
- **Details:** Returned: [foresters]. Expected: foresters only
- **Carrier Count:** 1
- **Top 3 (cheapest):**
  - Independent Order of Foresters (foresters): $32.38/mo ($370.00/yr) [INDEIOFE]
  - Independent Order of Foresters (foresters): $41.57/mo ($475.00/yr) [INDEIOFP]
  - Independent Order of Foresters (foresters): $106.75/mo ($1220.00/yr) [INDEIOSI]

## Test Group 5 — Health Analyzer Integration

### 5A: 35M, 5'10" 180lbs — normal build (HA enabled)
- **Result:** PASS
- **Details:** 74 products. HA: go=66, nogo=0, unknown=8, none=0
- **Carrier Count:** 35
- **Top 3 (cheapest):**
  - American General Life Insurance Company (aig): $24.92/mo ($294.95/yr) [AMGEATRG]
  - Banner Life Insurance Company (lga): $25.04/mo ($294.64/yr) [BANNBONS]
  - Symetra Life Insurance Company (symetra): $25.05/mo ($294.66/yr) [SYMESWME]

### 5B: 35M, 5'10" 280lbs — obese build (HA enabled)
- **Result:** PASS
- **Details:** 66 products. HA: go=3, nogo=37
- **Carrier Count:** 38
- **Sample HA Rejections:**
  - Transamerica Life Insurance Company: Above maximum weight limit of 243 lbs
  - Penn Mutual Life Insurance Company: Above maximum weight limit of 254 lbs
  - Principal National Life Insurance Co: Above maximum weight-age limit of 245 lbs
  - Principal National Life Insurance Co: Above maximum weight-age limit of 245 lbs
  - Thrivent Financial for Lutherans: Above maximum weight limit of 275 lbs

### 5C: 35M, DUI 3 years ago (HA enabled)
- **Result:** PASS
- **Details:** 66 products. HA: go=2, nogo=2. Eligibility rejections (sample): 7
- **Carrier Count:** 38
- **Health Code:** R (DUI → Standard)
- **HA Rejections:**
  - Columbus Life Insurance Company: No DUI/DWI convictions allowed in the last 5 year(s)
  - Assurity Life Insurance Co (Hero Life): No DUI/DWI convictions allowed in the last 99 year(s)
- **Eligibility Rejections:**
  - American Amicable: DUI: DECLINE
  - Foresters Financial: DUI: DECLINE; 2+ DUI = call Risk Assessment
  - Mutual of Omaha: Coverage $500,000 outside available range
  - NLG/LSW (National Life): Coverage $500,000 outside available range
  - Transamerica: Coverage $500,000 outside available range
  - Americo: Coverage $500,000 outside available range
  - United Home Life: Coverage $500,000 outside available range

## Test Group 6 — Carrier Name Mapping

### 6: Carrier name mapping audit (from 1A baseline)
- **Result:** PASS
- **Details:** 39 Compulife companies → 35 carrier IDs. 74 total products. All mapped successfully (unmapped are skipped by provider).
- **Carrier Count:** 35

**Full Mapping Table:**
```
AAA Life Insurance Company → aaa
American General Life Insurance Company → aig
American United Life Insurance Company → oneamerica
Ameritas Life Insurance Corp → ameritas
Assurity Life Insurance Co (Hero Life) → assurity
Assurity Life Insurance Company → assurity
AuguStar Life Assurance Corporation → augustar
Banner Life Insurance Company → lga
Banner Life Insurance Company (Ethos) → lga
BetterLife → betterlife
Cincinnati Life Insurance Company → cincinnati
Columbus Life Insurance Company → columbus
Equitable Financial Life Insurance Co → equitable
GBU Financial Life → gbu
Guardian Life Insurance Co of America → guardian
Illinois Mutual Life Insurance Company → illinoismutual
Independent Order of Foresters → foresters
John Hancock Life Insurance Company USA → jh
Life Insurance Company of the Southwest → nlg
Lincoln National Life Insurance Company → lincoln
Massachusetts Mutual Life Insurance → massmutual
Midland National Life Insurance Company → nlg
Minnesota Life Insurance Company → securian
NYLIFE Insurance Company of Arizona → newyorklife
National Life Insurance Company → nlg
Nationwide Life and Annuity Insurance Co → nationwide
North American Co for Life and Health → northamerican
Pacific Life Insurance Company → pacific
Penn Mutual Life Insurance Company → pennmutual
Principal National Life Insurance Co → principal
Protective Life Insurance Company → protective
Pruco Life Insurance Company → prudential
Savings Bank Mutual Life Ins Co of MA → sbli
Symetra Life Insurance Company → symetra
Thrivent Financial for Lutherans → thrivent
Transamerica Life Insurance Company → transamerica
Trusted Fraternal Life → trustedfraternal
United of Omaha Life Insurance Company → moo
Woman's Life Insurance Society → womanslife
```

---

## Summary

| # | Test | Result |
|---|------|--------|
| 1A | 35M non-smoker, TX, $500K, 20yr — baseline | PASS |
| 1B | 35M non-smoker, NY, $500K, 20yr — NY state filtering | PASS |
| 1C | 35M smoker, TX, $500K, 20yr — tobacco pricing | PASS |
| 1D | 35M non-smoker, TX, $500K, 10yr vs 30yr — category 3 vs 7 | PASS |
| 1E | 50M non-smoker, TX, $500K, 20yr — older age | PASS |
| 2A | 65M non-smoker, TX, $15K, FE — baseline | PASS |
| 2B | 65M non-smoker, NY, $15K, FE — NY uses state code 52 | PASS |
| 2C | 70F non-smoker, TX, $10K, FE — different age/gender/amount | PASS |
| 3A | 35M non-smoker, TX, $500K, 20yr, SI only | PASS |
| 3B | 35M non-smoker, TX, $500K, 20yr, FUW only | PASS |
| 3C | SI + FUW vs All comparison | PASS |
| 4A | COMPINC=INDE,TRAN,BANN — 3 carriers only | PASS |
| 4B | COMPINC=INDE — single carrier (Foresters) | PASS |
| 5A | 35M, 5'10" 180lbs — normal build (HA enabled) | PASS |
| 5B | 35M, 5'10" 280lbs — obese build (HA enabled) | PASS |
| 5C | 35M, DUI 3 years ago (HA enabled) | PASS |
| 6 | Carrier name mapping audit (from 1A baseline) | PASS |

**17/17 passed**

### Price Sanity Checks
- **Smoker vs Non-smoker (1C vs 1A):** $107.36 vs $24.92 — CORRECT
- **Age 50 vs Age 35 (1E vs 1A):** $77.35 vs $24.92 — CORRECT
- **FE 65M $15K vs 70F $10K (2A vs 2C):** $98.31 vs $60.16 — Different (CORRECT)
