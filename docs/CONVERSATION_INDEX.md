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

---

## 2026-02-27 — Security Patch + Rx Screening Wiring

**Branch:** `feature/lukas`
**Scope:** Critical security fixes, Rx/combo decline integration into quote flow

### What was done

**Security Patch (`1494897`)**
- SMS webhook: added ED25519 signature verification via `verifyTelnyxWebhook()`
- Notes IDOR: added `agent_id` filter to `getNotesForLead()` and `deleteNote()`
- SIP credentials: added no-cache headers, documented client exposure requirement
- CSRF: removed `X-CSRF-Protection` header bypass, require Origin/Referer only
- License CRUD: added `agent_id` ownership check to `updateLicense`/`deleteLicense`
- Call log: verify lead belongs to authenticated user before saving
- CSP: removed `unsafe-eval` from `script-src` in production

**Rx Screening in Quote Flow (`8ebf184`)**
- Quote route calls `checkPrescriptionScreening()` and `checkCombinationDeclines()` per carrier
- New `UnderwritingWarning` type (`rx_decline | rx_review | combo_decline`)
- Match scoring penalties: -10 per Rx DECLINE, -3 per Rx REVIEW, -5 per combo decline
- Carrier results UI: red ShieldAlert icon with tooltip, color-coded warning pills

**Rx DECLINE as Hard Filter (`9757178`)**
- Rx DECLINE now sets `isEligible=false` (carrier removed from eligible results)
- `GRADED_ELIGIBLE` maps to distinct `rx_graded` warning type (amber badge)

### Commits

- `1494897` — fix: patch 2 CRITICAL + 5 HIGH security vulnerabilities
- `8ebf184` — feat: wire Rx screening and combo declines into quote flow with score penalties
- `9757178` — feat: wire Rx DECLINE into eligibility, add rx_graded warning type

---

## 2026-02-28 — Compulife API Integration

**Branch:** `feature/lukas`
**Scope:** Replace mock pricing with real Compulife cloud API, carrier expansion to 64

### What was done

**Compulife Cloud API (`ea83f96`)**
- Rewrote `CompulifePricingProvider` to call `compulifeapi.com` directly (replaces planned self-hosted CGI)
- Returns 75+ carriers with real pricing per quote
- `STATE_TO_CODE`: 51 state abbreviations to Compulife numeric codes
- `TERM_TO_CATEGORY`: term lengths to NewCategory codes (35/40yr unsupported, falls back to mock)
- 38 carrier name mappings from real API responses
- Map-based deduplication (O(n), keeps cheapest per carrier)
- Promise-coalesced IP lookup (no race condition)
- `CompulifeWithMockFallback` composite provider in `pricing-config.ts`

**Bug Fixes**
- `4ce30b3` — Supplement Compulife results with mock pricing for carriers not in API response
- `5ff9045` — Accept full state names ("Texas" -> "TX") via `STATE_NAME_TO_ABBR` mapping

**UX + Lead Data (`d56b415`)**
- Removed auto-quoting: quotes only fire on explicit "Get Quotes" click
- Added `height_feet`, `height_inches`, `weight` to leads table (migration applied)
- Improved PDL enrichment: send city/state/LinkedIn as search params, show in popover

**Carrier Expansion 38 -> 64 (`ac99206`)**
- Build script (`scripts/build-carriers.ts`) reads extraction JSONs, generates `carriers-generated.ts` (72,751 lines)
- 26 new carriers added, 15 existing carriers updated with expanded data
- Totals: 2,326 medical conditions, 7,208 Rx entries, 136 products
- Added `GRADED_ELIGIBLE` to `PrescriptionAction` type
- Fixed MOO marijuana classification: "Tobacco rates" -> "Non-tobacco rates"

### Commits

- `9317435` — fix: compulife API test script — raw JSON URL + REMOTE_IP field
- `ba5ac3c` — chore: gitignore compulife API response file
- `ea83f96` — feat: integrate Compulife cloud API for real carrier pricing
- `4ce30b3` — fix: supplement Compulife results with mock pricing for uncovered carriers
- `5ff9045` — fix: accept full state names in Compulife provider
- `d56b415` — feat: remove auto-quoting, persist height/weight, improve PDL enrichment
- `ac99206` — feat: integrate 26 new carriers + update 15 existing from extraction database

---

## 2026-03-01 — Quote Engine Intelligence + Security Audit

**Branch:** `feature/lukas`
**Scope:** Health class mapping, nicotine classification, full codebase security audit + remediation

### What was done

**Health Class Mapping (`1378bc6`)**
- `mapHealthClass()` considers BMI + tobacco + medical conditions + DUI -> Compulife health class (PP/P/RP/R)
- Replaces hardcoded `Health: "PP"` — higher risk clients now see realistic Standard rates
- Added pricing disclaimer banner above carrier results + one-liner in carrier detail modal

**Nicotine Type Classification (`3b78ca9`)**
- `NicotineType` enum: none, cigarettes, vaping, cigars, smokeless, pouches, marijuana, nrt
- Follow-up dropdown when "Smoker" selected
- Parallel Compulife calls (smoker + non-smoker) for non-cigarette types
- `classifyTobaccoForCarrier()` reads carrier TobaccoRules per nicotine type
- `hasNicotineAdvantage()` generalizes match score bonus (+12) for any carrier with favorable rules
- DUI toggle moved to first item in Medical History section
- `nicotine_type` persisted to leads table (migration applied)

**Re-quote Bug Fix (`57f2204`)**
- Coverage amount and term length now read from Zustand store instead of form stale defaults

**Security Audit + Remediation**
- Full codebase audit documented in `docs/CODEBASE_AUDIT.md` (19 findings)
- `6a7ed44` — CRITICAL + HIGH fixes: HMAC-signed OAuth state, sanitized 12 API error responses, Telnyx error leak, UUID validation, CSRF exempt paths, SIP credentials documented
- `5ae5ff8` — MEDIUM fixes: console.error PII sanitization (40+ sites), webhook dev warning, dangerouslySetInnerHTML docs, CSP docs, .gitignore expansion, dependency audit
- `7f6ad2c` — LOW fixes: usage date range validation, redirect tightening (`/@`, `/\` blocked), Compulife IP-locking docs, X-Forwarded-For docs
- Result: 15 of 19 findings resolved, 4 remaining as accepted risks or awaiting upstream

### Commits

- `1378bc6` — feat: map BMI + risk factors to Compulife health class, add pricing disclaimers
- `3b78ca9` — feat: add nicotine type selection with dual pricing, move DUI up
- `57f2204` — fix: read coverage amount and term length from Zustand store on re-quote
- `6a7ed44` — fix: resolve critical and high security findings from audit
- `5ae5ff8` — fix: resolve medium security findings from audit
- `7f6ad2c` — fix: resolve low security findings from audit
- `c673ff1` — docs: update audit doc with latest commit hash
