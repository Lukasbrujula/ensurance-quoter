# Conversation Index

Session logs for major development work on Ensurance Quoter.

---

## 2026-02-26 — Structured Carrier Intelligence Integration

**Branch:** `feature/lukas`
**Scope:** Carrier data extraction, type system evolution, eligibility engine enhancement, UI enrichment

### What was done

**PDF Extraction Pipeline**
- Extracted structured underwriting data from ~30 carrier PDF guides using 10 parallel Claude Code instances
- 17 carriers completed with full structured data; 7 existing carriers enriched, 7 new carriers added
- Data extracted: medical condition rules, prescription exclusions, combination decline triggers, living benefits detail, rate class criteria

**Type System Evolution (`lib/types/carrier.ts`)**
- Added `"guaranteedIssue"` to `ProductType`, `"NR"` to `AmBestRating`
- New interfaces: `ProductParameters`, `MedicalConditionRule`, `CombinationDecline`, `PrescriptionExclusion`, `PrescriptionExclusions`, `LivingBenefitRider`, `AccidentalDeathBenefit`, `OtherRider`, `LivingBenefitsDetail`, `RateClassThresholds`, `RateClassCriteria`
- Extended `Product`, `TobaccoRules`, `DUIRule`, `OperationalInfo` with optional structured fields
- Added 8 optional intelligence fields to `Carrier` interface
- All changes backward compatible — no existing fields modified or removed

**Carrier Data (`lib/data/carriers.ts`)**
- File grew to ~198KB (from ~30KB)
- 7 existing carriers enriched with structured data: amam, americo, foresters, moo, sbli, transamerica, uhl
- 7 new term life carriers added: AIG, American Home Life, Baltimore Life, BetterLife, Guarantee Trust Life, Illinois Mutual, Pekin Life
- 20 additional carriers added with basic profile data (protective through kemper)
- Total: 38 carriers (up from 11)

**AM Best Ratings**
- Researched and updated AM Best ratings for all 38 carriers
- 4 carriers specifically had ratings updated: americanhomelife (NR), betterlife (NR), baltimore (B++), colonialpenn (B++)
- Added NR: 0 to AM_BEST_SCORES in match-scoring.ts

**Eligibility Engine (`lib/engine/eligibility.ts`)**
- `checkStructuredMedicalEligibility()` — precision decision/lookback matching via MedicalConditionRule[], falls back to legacy medicalHighlights
- `checkPrescriptionScreening()` — screens user medications against carrier Rx exclusions
- `checkCombinationDeclines()` — detects multi-condition decline triggers
- All existing functions preserved as-is

**Carrier Detail Modal (`components/quote/carrier-detail-modal.tsx`)**
- Searchable medical conditions table with color-coded DecisionBadge
- Searchable prescription exclusion database table
- Combination decline alerts (red banners) when client triggers multi-condition rules
- Combination decline rules reference list
- Structured living benefits: rider cards for terminal/critical/chronic illness with triggers, max %, costs, ADB, other riders
- Enhanced DUI section with structured lookback years, flat extra, special rules
- All existing fallbacks preserved for carriers without structured data

### Data Totals (verified from source)

| Metric | Count |
|--------|-------|
| Total carriers | 38 |
| Carriers with structured intelligence | 14 |
| Medical condition rules | 616 across 11 carriers |
| Prescription exclusion entries | 557 across 3 carriers |
| Combination decline rules | 65 across 8 carriers |
| Carriers with living benefits detail | 14 |
| Carriers with rate class criteria | 7 |

### Commits

- `92412c3` — feat: add 7 new carriers + structured intelligence types for carrier data
- `bdcc832` — feat: wire structured carrier intelligence into eligibility engine and Underwriting tab
