# Compulife Cloud API Reference

Comprehensive reference for the Compulife cloud API as used in Ensurance. Covers request parameters, response fields, category codes, health codes, and what we currently use vs. what's available.

---

## Connection Modes

### Direct Mode (Local Dev)
- Endpoint: `https://compulifeapi.com/newquoteresultspage`
- Auth: `AuthorizationID` form field (IP-locked on first use)
- Set `COMPULIFE_AUTH_ID` env var

### Proxy Mode (Production/Vercel)
- Endpoint: `{COMPULIFE_PROXY_URL}/api/compulife`
- Auth: `x-proxy-secret` header
- Set `COMPULIFE_PROXY_URL` + `COMPULIFE_PROXY_SECRET` env vars
- Railway proxy with fixed outbound IP (Vercel has dynamic IPs)

### Fallback
When neither env var is set, or on API errors, falls back to `MockPricingProvider` (formula-based estimates).

---

## Request Parameters

Sent as `application/x-www-form-urlencoded` POST body:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `AuthorizationID` | string | IP-locked auth ID | `ABC123` |
| `FaceAmount` | number | Coverage amount in dollars | `500000` |
| `State` | 1-51 | Compulife numeric state code | `44` (Texas) |
| `BirthYear` | number | 4-digit birth year | `1991` |
| `BirthMonth` | 1-12 | Birth month | `6` |
| `Birthday` | 1-31 | Birth day | `15` |
| `Sex` | M/F | Gender | `M` |
| `Smoker` | Y/N | Tobacco status | `N` |
| `Health` | string | Health/rate class code | `PP` |
| `NewCategory` | string | Product category code | `5` |
| `OutputCode` | string | Response format | `JSON` |

### State Code Mapping (US States → Compulife Numeric)

```
AL=1  AK=2  AZ=3  AR=4  CA=5  CO=6  CT=7  DE=8  DC=9  FL=10
GA=11 HI=12 ID=13 IL=14 IN=15 IA=16 KS=17 KY=18 LA=19 ME=20
MD=21 MA=22 MI=23 MN=24 MS=25 MO=26 MT=27 NE=28 NV=29 NH=30
NJ=31 NM=32 NY=33 NC=34 ND=35 OH=36 OK=37 OR=38 PA=39 RI=40
SC=41 SD=42 TN=43 TX=44 UT=45 VT=46 VA=47 WA=48 WV=49 WI=50
WY=51
```

---

## Health Codes

### Standard Rate Classes

| Code | Label | Description |
|------|-------|-------------|
| `PP` | Preferred Plus | Best rate class — excellent health, no tobacco |
| `P` | Preferred | Good health, minor issues acceptable |
| `RP` | Regular Plus | Standard health with some conditions |
| `R` | Standard | Base rate class |

### Table Ratings (Substandard)

| Code | Surcharge | Description |
|------|-----------|-------------|
| `T1` | +25% | Table 1 — mild substandard |
| `T2` | +50% | Table 2 |
| `T3` | +75% | Table 3 |
| `T4` | +100% | Table 4 — double standard rate |
| `T5`-`T16` | +125%-400% | Progressively worse |

**Currently used:** PP, P, RP, R (standard classes for rate spread), T1-T4 (table ratings toggle)
**Not yet used:** T5-T16 (severe substandard — rarely needed)

---

## NewCategory Codes (Product Types)

### Level Term (Currently Used: 3-7)

| Code | Product Type | Term |
|------|-------------|------|
| `1` | 1 Year Level Term | 1yr |
| `2` | 5 Year Level Term | 5yr |
| `3` | 10 Year Level Term | 10yr |
| `4` | 15 Year Level Term | 15yr |
| `5` | 20 Year Level Term | 20yr |
| `6` | 25 Year Level Term | 25yr |
| `7` | 30 Year Level Term | 30yr |

### Level-to-Age (Currently Used: T, U, V, A-E)

| Code | Product Type | Target Age |
|------|-------------|------------|
| `T` | To Age 65 Level Guaranteed | 65 |
| `U` | To Age 70 Level Guaranteed | 70 |
| `V` | To Age 75 Level Guaranteed | 75 |
| `A` | To Age 80 Level Guaranteed | 80 |
| `B` | To Age 85 Level Guaranteed | 85 |
| `C` | To Age 90 Level Guaranteed | 90 |
| `D` | To Age 95 Level Guaranteed | 95 |
| `E` | To Age 100 Level Guaranteed | 100 |
| `G` | To Age 105 Level Guaranteed | 105 |
| `H` | To Age 110 Level Guaranteed | 110 |

### Return of Premium (Currently Used: J, K, L, M)

| Code | Product Type | Term |
|------|-------------|------|
| `J` | 15 Year ROP | 15yr |
| `K` | 20 Year ROP | 20yr |
| `L` | 25 Year ROP | 25yr |
| `M` | 30 Year ROP | 30yr |
| `W` | To Age 65 ROP | — |
| `X` | To Age 70 ROP | — |
| `Y` | To Age 75 ROP | — |
| `N` | Other Return of Premium | — |

### No-Lapse Universal Life (Currently Used: 8)

| Code | Product Type | Used? |
|------|-------------|-------|
| `8` | To Age 121 (No Lapse UL) | **YES** |
| `P` | To Age 121 - Pay to 100 | NO |
| `Q` | To Age 121 - Pay to 65 | NO |
| `R` | To Age 121 - 20 Pay | NO |
| `S` | To Age 121 - 10 Pay | NO |
| `O` | To Age 121 - Single Pay | NO |

### Other

| Code | Product Type |
|------|-------------|
| `F` | Other Term |
| `Z:XXX` | Multi-category comparison (e.g., `Z:357` = 10yr + 20yr + 30yr in one call) |

---

## JSON Response Structure

```json
{
  "licensee": "Compulife API",
  "AccessDate": {
    "month": "February",
    "day": "28th",
    "year": "2026",
    "ambestdate": "Jan 30 2026"
  },
  "Lookup": {
    "state_fromzipcode": "44",
    "Birthdate": { "day": "15", "month": "6", "year": "1991", "NearestAge": "35", "ActualAge": "34" },
    "faceamount": "500000",
    "health": "PP",
    "healthtxt": "Preferred Plus",
    "sex": "M",
    "smoker": "N",
    "category": "5",
    "Sort": "A",
    "Mode": "M",
    "NewCategory": "5",
    "State": "44"
  },
  "Compulife_ComparisonResults": {
    "Compulife_Copyright": "These results are copyright Compulife 2026",
    "Compulife_title": "20 Year Level Term Guaranteed",
    "Compulife_Results": [
      {
        "Compulife_company": "Symetra Life Insurance Company",
        "Compulife_ambest": "AMB # 07017 A  (5-22-25)",
        "Compulife_amb": "A",
        "Compulife_ambnumber": "07017",
        "Compulife_compprodcode": "SYMESWMB",
        "Compulife_premiumAnnual": "234.66",
        "Compulife_premiumM": "19.95",
        "Compulife_guar": "gtd",
        "Compulife_product": "Symetra SwiftTerm 20  (E-App only)",
        "Compulife_rgpfpp": "P+",
        "Compulife_healthcat": "Super Preferred Non-Nicotine"
      }
    ]
  }
}
```

---

## Response Fields (Per Result)

| Field | Type | Description | We Use? |
|-------|------|-------------|---------|
| `Compulife_company` | string | Full carrier name | **YES** — mapped to internal carrier ID via 70+ entry lookup |
| `Compulife_premiumAnnual` | string | Annual premium (parseable float) | **YES** → `annualPremium` |
| `Compulife_premiumM` | string | Monthly premium (parseable float) | **YES** → `monthlyPremium` |
| `Compulife_healthcat` | string | Full rate class name ("Super Preferred Non-Nicotine") | **YES** → `riskClass` |
| `Compulife_rgpfpp` | string | Short rate class code ("P+", "Pf", "R+", "Rg") | **YES** — fallback for `riskClass` |
| `Compulife_product` | string | Product name (includes eApp, conversion details) | **YES** → `productName` |
| `Compulife_compprodcode` | string | Internal product code ("SYMESWMB") | **YES** → `productCode` |
| `Compulife_guar` | string | `"gtd"` = guaranteed, `"**"` = illustrated | **YES** → `isGuaranteed` |
| `Compulife_amb` | string | AM Best rating letter grade ("A+", "A", "A-") | **YES** → `amBestRating` (overrides static data) |
| `Compulife_ambest` | string | Full AM Best string with date ("AMB # 07017 A (5-22-25)") | NO — could extract rating date |
| `Compulife_ambnumber` | string | AM Best company number | NO |
| `Compulife_Copyright` | string | Legal notice | N/A |

### Lookup Metadata

| Field | Description |
|-------|-------------|
| `Lookup.Birthdate.NearestAge` | Compulife's calculated nearest age |
| `Lookup.Birthdate.ActualAge` | Actual age at quote time |
| `Lookup.healthtxt` | Full health class label |
| `AccessDate.ambestdate` | Last AM Best data file update date |

---

## What We Currently Use

### Implemented Features

| Feature | Phase | How |
|---------|-------|-----|
| Multi-product per carrier | 1c | Return all product variants instead of deduplicating to cheapest |
| Guaranteed badge | 1a | Parse `Compulife_guar === "gtd"` → display "Gtd" / "Illust." badges |
| Fresh AM Best | 1b | Use `Compulife_amb` from API, override static `carriers.ts` data |
| Rate class spread | 2 | Parallel calls for PP/P/RP/R → show pricing at each rate class |
| Return of Premium | 3a | Toggle sends additional call with category J/K/L/M |
| Level-to-Age | 3b | Dropdown sends call with category T/U/V/A-E based on target age |
| Table Ratings | 4 | Toggle fires parallel calls for T1-T4 health codes (substandard pricing) |
| ROP Level-to-Age | 5a | When ROP + term-to-age both enabled, fires W/X/Y category (ages 65/70/75) |
| No-Lapse UL | 5b | Toggle fires category `8` call for permanent coverage |
| Term Comparison | 5c | Toggle fires parallel calls for all 5 standard terms (10/15/20/25/30yr) |

### Implementation Flow

```
IntakeForm → QuoteRequest → POST /api/quote
  ├── Standard term call (categories 3-7)
  ├── Nicotine dual-pricing (smoker + non-smoker parallel calls, if applicable)
  ├── Rate class spread (3 parallel calls for non-primary health classes)
  ├── ROP call (categories J/K/L/M, if includeROP toggle is on)
  ├── Term-to-Age call (categories T/U/V/A-E, if termToAge is set)
  ├── Table rating calls (T1-T4 health codes in parallel, if includeTableRatings toggle is on)
  ├── ROP-to-Age call (categories W/X/Y, if both includeROP and termToAge are set, ages 65/70/75 only)
  ├── No-Lapse UL call (category 8, if includeUL toggle is on)
  └── Term comparison calls (categories 3-7 minus current, if compareTerms toggle is on)
→ QuoteResponse { quotes: CarrierQuote[] }
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/engine/pricing.ts` | `PricingProvider` interface, `PricingRequest`, `PricingResult` types |
| `lib/engine/compulife-provider.ts` | Compulife API integration, state/category mappings, company→carrier ID lookup |
| `lib/engine/pricing-config.ts` | Provider selection: `CompulifeWithMockFallback` composite |
| `lib/engine/mock-provider.ts` | Fallback formula-based pricing |
| `app/api/quote/route.ts` | Quote orchestration: eligibility + pricing + scoring + rate spread + ROP + TTA |
| `lib/types/quote.ts` | Domain types: `QuoteRequest`, `CarrierQuote`, `RateClassPrice` |

### PricingRequest Overrides

Two override fields allow flexible API querying without modifying the main logic:

| Override | Purpose | Used By |
|----------|---------|---------|
| `healthClassOverride` | Force specific health code (PP/P/RP/R) | Rate class spread calls |
| `categoryOverride` | Force specific NewCategory code | ROP calls (J/K/L/M), Term-to-Age calls (T/U/V/A-E) |

---

## What's Available But Not Yet Used

### Future Possibilities

| Feature | Details |
|---------|---------|
| `Z:` multi-category syntax | Single-call comparison (e.g., `Z:357`) — currently we use parallel calls instead for reliability |
| Health Analyzer | Built-in underwriting pre-qualification (go/no-go per carrier) — could cross-reference with our 137-condition system |
| Year-by-year spreadsheet | Side-by-side analysis for up to 6 products (guaranteed vs current premiums over time) |
| Policy fee | Available via template dollar codes, not in JSON response |
| Income Replacement Calculator | Needs assessment tool (not core to quoting) |
| UL Pay Variants | Categories P (Pay to 100), Q (Pay to 65), R (20 Pay), S (10 Pay), O (Single Pay) |

### Carrier Logos (Already Used)
CDN: `https://compulifeapi.com/images/logosapi/{CODE}_small.gif` (120x38) and `{CODE}_medium.gif` (240x74)
Mapped in `lib/data/carrier-logos.ts` (51 carriers).

---

## Company Name → Carrier ID Mapping

The `COMPULIFE_COMPANY_TO_CARRIER_ID` lookup in `compulife-provider.ts` maps 70+ Compulife company names to our internal carrier IDs. Examples:

```
"symetra life insurance company" → "symetra"
"protective life insurance company" → "protective"
"american general life insurance company" → "aig"
"north american company for property and casualty insurance" → "northamerican"
```

Carriers not in this mapping are skipped (returned as results but not matched to our intelligence data).

---

## Rate Limiting & Performance

- Each quote fires 1 primary call + up to 3 rate-spread calls + optional add-ons
- Optional calls: ROP (1), TTA (1), ROP-to-Age (1), Table Ratings (4), UL (1), Term Comparison (4)
- Maximum ~15 parallel calls per quote request (if all toggles enabled)
- Compulife has no documented rate limit, but we cap concurrent calls
- Dual-pricing mode (nicotine classification) skips rate spread to avoid 8+ calls
- All additional calls (ROP, TTA, spread) are non-fatal — wrapped in try/catch

---

## Data Freshness

- Compulife updates carrier data and AM Best ratings **monthly**
- `AccessDate.ambestdate` in response shows last data file date
- Our static `carriers.ts` AM Best data may be stale between manual updates
- Compulife AM Best (`Compulife_amb`) overrides static data when available
