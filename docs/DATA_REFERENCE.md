# Data Reference

**Last updated:** 2026-02-26
**Source file:** `lib/data/carriers.ts` (~198KB)

---

## Carrier Registry (38 carriers)

### AM Best Distribution

| Rating | Count | Carrier IDs |
|--------|-------|-------------|
| A++ | 2 | massmutual, newyorklife |
| A+ | 13 | moo, jh, lga, protective, lincoln, prudential, nationwide, pacific, principal, northamerican, securian, pennmutual, globelife |
| A | 13 | foresters, sbli, nlg, transamerica, americo, aig, gtl, corebridge, globalatlantic, symetra, brighthouse, gerber, anico |
| A- | 6 | amam, uhl, fg, illinoismutual, pekin, kemper |
| B++ | 2 | baltimore, colonialpenn |
| NR | 2 | americanhomelife, betterlife |

### All Carriers

| # | ID | Name | AM Best | Med Conditions | Rx Exclusions | Combo Declines | Living Benefits Detail | Rate Class Criteria |
|---|---|---|---|---|---|---|---|---|
| 1 | amam | American Amicable | A- | 105 | 379 | 22 | Yes | Yes |
| 2 | foresters | Foresters Financial | A | -- | -- | 3 | Yes | -- |
| 3 | moo | Mutual of Omaha | A+ | 10 | 119 | 7 | Yes | -- |
| 4 | jh | John Hancock | A+ | -- | -- | -- | -- | -- |
| 5 | lga | LGA / Banner Life | A+ | -- | -- | -- | -- | -- |
| 6 | sbli | SBLI | A | 22 | -- | -- | Yes | -- |
| 7 | nlg | NLG/LSW (National Life) | A | -- | -- | -- | -- | -- |
| 8 | transamerica | Transamerica | A | 52 | -- | -- | Yes | Yes |
| 9 | americo | Americo | A | -- | -- | -- | Yes | -- |
| 10 | uhl | United Home Life | A- | -- | -- | -- | Yes | -- |
| 11 | fg | F&G (Fidelity & Guaranty) | A- | -- | -- | -- | -- | -- |
| 12 | aig | AIG / American General | A | 40 | -- | -- | Yes | Yes |
| 13 | americanhomelife | American Home Life | NR | 80 | 59 | 16 | Yes | -- |
| 14 | baltimore | Baltimore Life | B++ | 46 | -- | -- | Yes | -- |
| 15 | betterlife | BetterLife | NR | 56 | -- | 4 | Yes | Yes |
| 16 | gtl | Guarantee Trust Life | A | 32 | -- | 2 | Yes | Yes |
| 17 | illinoismutual | Illinois Mutual | A- | 90 | -- | 3 | Yes | Yes |
| 18 | pekin | Pekin Life | A- | 83 | -- | 8 | Yes | Yes |
| 19 | protective | Protective Life | A+ | -- | -- | -- | -- | -- |
| 20 | corebridge | Corebridge Financial | A | -- | -- | -- | -- | -- |
| 21 | lincoln | Lincoln Financial | A+ | -- | -- | -- | -- | -- |
| 22 | prudential | Prudential | A+ | -- | -- | -- | -- | -- |
| 23 | nationwide | Nationwide | A+ | -- | -- | -- | -- | -- |
| 24 | pacific | Pacific Life | A+ | -- | -- | -- | -- | -- |
| 25 | principal | Principal Financial | A+ | -- | -- | -- | -- | -- |
| 26 | northamerican | North American | A+ | -- | -- | -- | -- | -- |
| 27 | securian | Securian Financial | A+ | -- | -- | -- | -- | -- |
| 28 | globalatlantic | Global Atlantic | A | -- | -- | -- | -- | -- |
| 29 | massmutual | MassMutual | A++ | -- | -- | -- | -- | -- |
| 30 | newyorklife | New York Life | A++ | -- | -- | -- | -- | -- |
| 31 | pennmutual | Penn Mutual | A+ | -- | -- | -- | -- | -- |
| 32 | symetra | Symetra | A | -- | -- | -- | -- | -- |
| 33 | brighthouse | Brighthouse Financial | A | -- | -- | -- | -- | -- |
| 34 | gerber | Gerber Life | A | -- | -- | -- | -- | -- |
| 35 | colonialpenn | Colonial Penn | B++ | -- | -- | -- | -- | -- |
| 36 | globelife | Globe Life | A+ | -- | -- | -- | -- | -- |
| 37 | anico | American National | A | -- | -- | -- | -- | -- |
| 38 | kemper | Kemper Life | A- | -- | -- | -- | -- | -- |

---

## Structured Intelligence Fields

All structured fields are **optional** on the `Carrier` interface, added 2026-02-26. Carriers without structured data use legacy free-text fields (`medicalHighlights`, `livingBenefits` string, `dui.rule`/`dui.result`). Both pathways are preserved for backward compatibility.

### Medical Conditions (`medicalConditions: MedicalConditionRule[]`)

Structured arrays with per-condition decision, lookback period, rate class impact, and notes.

| Carrier | Count | Coverage |
|---------|-------|----------|
| amam | 105 | Most comprehensive: cardiovascular, cancer, diabetes, neurological, psychiatric, respiratory, autoimmune, liver, kidney, musculoskeletal, blood disorders |
| illinoismutual | 90 | Broad coverage across most condition categories |
| pekin | 83 | Broad coverage with combination decline triggers |
| americanhomelife | 80 | Includes rare conditions and specific medication triggers |
| betterlife | 56 | Core conditions with rate class impacts |
| transamerica | 52 | Focused on high-impact conditions |
| baltimore | 46 | Core cardiovascular, cancer, metabolic conditions |
| aig | 40 | Major conditions with structured lookback periods |
| gtl | 32 | Core conditions with clear decision rules |
| sbli | 22 | Key conditions only |
| moo | 10 | High-level major conditions |
| **Total** | **616** | |

**Decision types:** ACCEPT, DECLINE, CONDITIONAL, MODIFIED, STANDARD, REVIEW

Each `MedicalConditionRule` contains:
- `condition` — condition name (e.g., "Type 2 Diabetes", "Atrial Fibrillation")
- `decision` — one of the 6 MedicalDecision values
- `lookbackMonths` — months since diagnosis/treatment that affect decision (null = not time-dependent)
- `conditions` — qualifying conditions for the decision (e.g., "A1C < 8.0")
- `rateClass` — expected rate class assignment (e.g., "Standard", "Table D")
- `notes` — additional context

### Prescription Exclusions (`prescriptionExclusions: PrescriptionExclusions`)

Carrier-specific medication databases that flag prescriptions for DECLINE or REVIEW.

| Carrier | Medication Count | Notes |
|---------|-----------------|-------|
| amam | 379 | By far the most comprehensive Rx database |
| moo | 119 | Focused on high-risk medications |
| americanhomelife | 59 | Core medication exclusions |
| **Total** | **557** | |

Each `PrescriptionExclusion` contains:
- `name` — medication name (brand or generic)
- `action` — DECLINE, REVIEW, or ACCEPT
- `associatedCondition` — the condition the medication treats
- `notes` — additional screening notes

### Combination Declines (`combinationDeclines: CombinationDecline[]`)

Multi-condition decline rules — when 2+ conditions co-exist, the carrier declines even if each condition alone would be accepted.

| Carrier | Rule Count |
|---------|-----------|
| amam | 22 |
| americanhomelife | 16 |
| pekin | 8 |
| moo | 7 |
| betterlife | 4 |
| foresters | 3 |
| illinoismutual | 3 |
| gtl | 2 |
| **Total** | **65** |

### Living Benefits Detail (`livingBenefitsDetail: LivingBenefitsDetail`)

Structured breakdown of terminal, critical, and chronic illness riders plus ADB and other riders.

**14 carriers** have this data: amam, foresters, moo, sbli, transamerica, americo, uhl, aig, americanhomelife, baltimore, betterlife, gtl, illinoismutual, pekin

Structure:
- `terminalIllness` — LivingBenefitRider (available, type, cost, trigger, maxPercent, maxAmount, notes)
- `criticalIllness` — LivingBenefitRider
- `chronicIllness` — LivingBenefitRider
- `accidentalDeathBenefit` — AccidentalDeathBenefit (available, issueAges, maxAmount, notes)
- `otherRiders` — OtherRider[] (name, cost, availability, description, notes)
- `exclusionConditions` — string[]

### Rate Class Criteria (`rateClassCriteria: RateClassCriteria`)

Underwriting thresholds for rate class qualification (Preferred Plus, Preferred, Standard Plus, Standard).

**7 carriers** have this data: amam, transamerica, aig, betterlife, gtl, illinoismutual, pekin

Each rate class threshold includes:
- `tobaccoFreeMonths`, `bpMaxSystolic`, `bpMaxDiastolic`
- `cholesterolMax`, `cholesterolRatioMax`
- `bmiMin`, `bmiMax`, `duiFreeMonths`
- `familyHistory`, `otherRequirements[]`

---

## Enrichment Coverage Summary

| Intelligence Level | Carrier Count | Description |
|-------------------|---------------|-------------|
| **Full structured** | 14 | At least one structured intelligence field (medicalConditions, prescriptionExclusions, combinationDeclines, livingBenefitsDetail, or rateClassCriteria) |
| **Basic only** | 24 | Core fields only: products, state availability, tobacco rules, DUI rules, medicalHighlights (free text), livingBenefits (free text) |

### Basic-only carriers (no structured intelligence)
jh, lga, nlg, fg, protective, corebridge, lincoln, prudential, nationwide, pacific, principal, northamerican, securian, globalatlantic, massmutual, newyorklife, pennmutual, symetra, brighthouse, gerber, colonialpenn, globelife, anico, kemper

---

## Engine Integration

### Eligibility Engine (`lib/engine/eligibility.ts`)

The structured data feeds into three new engine functions:

1. **`checkStructuredMedicalEligibility(carrier, conditionIds[])`** — Uses `MedicalConditionRule[]` when available, normalizes condition names for fuzzy matching, falls back to legacy `medicalHighlights` string matching. Returns `StructuredMedicalResult[]` with source indicator.

2. **`checkPrescriptionScreening(carrier, medicationsInput)`** — Screens comma-separated user medications against `prescriptionExclusions.medications[]`. Uses bidirectional substring matching. Returns only DECLINE/REVIEW matches.

3. **`checkCombinationDeclines(carrier, conditionIds[])`** — Checks if 2+ of the client's conditions match any `combinationDeclines` rule. Uses normalized fuzzy matching.

### Match Scoring (`lib/engine/match-scoring.ts`)

AM Best scores updated for new rating values:
- A++: 15, A+: 15, A: 12, A-: 10, B++: 7, NR: 0

### Carrier Detail Modal (`components/quote/carrier-detail-modal.tsx`)

Underwriting tab enhanced with:
- **Searchable Medical Conditions Table** — `MedicalConditionsTable` component with text search, color-coded `DecisionBadge` (red=Decline, yellow=Conditional/Review, green=Accept, orange=Modified, blue=Standard)
- **Searchable Prescription Screening Database** — `PrescriptionScreeningSection` with text search, action badges
- **Combination Decline Alerts** — Red banners when client's conditions trigger multi-condition decline rules
- **Combination Decline Rules Reference** — Full list of all combination decline rules for the carrier
- **Structured Living Benefits** — `LivingBenefitsStructured` component showing rider cards for terminal/critical/chronic illness with trigger, max %, cost, ADB, other riders
- **Enhanced DUI Section** — Structured lookback years, flat extra, special rules fields
- **Structured Medical Eligibility** — Per-condition results with DecisionBadge, lookback period, rate class, notes (uses structured data when available, legacy fallback otherwise)
- All legacy fallbacks preserved for carriers without structured data

---

## Data Source

All structured intelligence data was extracted from carrier PDF underwriting guides using Claude Code parallel instances (2026-02-26). The extraction covered 30 carriers across 10 parallel sessions, with 17 carriers completed with full structured data. The remaining carriers have basic profile data.

Data fields are all **optional** on the `Carrier` interface — the type system and UI gracefully degrade to legacy fields when structured data is absent.

---

## Data Collection History

| Date | Source | What Was Captured | Label |
|------|--------|-------------------|-------|
| Feb 2026 | Carrier PDF underwriting guides | Structured intelligence for 14 carriers (medical conditions, Rx exclusions, combo declines, living benefits, rate class criteria) | "Carrier intelligence extraction" |
| Mar 2026 | Compulife API samples folder + readme.html | Full NewCategory code list, input/output parameter reference, FE/GIWL research, open questions logged | "Compulife FE research" |

---

## Compulife Product Type Reference

Full NewCategory code list, input/output parameters, and API architecture are documented in COMPULIFE_REFERENCE.md. Key codes: term = 1-9 and 0, Final Expense/GIWL = X, Permanent UL = 8 and variants P/Q/R/S/O.
