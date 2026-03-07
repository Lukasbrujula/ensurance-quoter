# Compulife Cloud API Reference

Comprehensive reference for the Compulife cloud API as used in Ensurance. Covers request parameters, response fields, category codes, health codes, Health Analyzer underwriting inputs, and what we currently use vs. what's available.

---

## Connection Modes

### Direct Mode (Local Dev)

- Endpoint: `https://compulifeapi.com/api/request/?COMPULIFEAUTHORIZATIONID={AUTH_ID}&REMOTE_IP=null`
- Auth: `COMPULIFEAUTHORIZATIONID` query param (IP-locked on first use)
- `REMOTE_IP=null` bypasses IP forwarding (uses caller's IP for auth)
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

All parameters are passed as a JSON object in the `COMPULIFE` query parameter (URL-encoded). Auth ID and `REMOTE_IP` can also be passed as separate top-level query params.

**Endpoint:**

```
GET https://compulifeapi.com/api/request/?COMPULIFEAUTHORIZATIONID={id}&REMOTE_IP=null&COMPULIFE={url_encoded_json}
```

> **Important:** The API does NOT accept `multipart/form-data` or `application/x-www-form-urlencoded` POST bodies — these return `406 Not Acceptable`. All fields must be inside the `COMPULIFE` JSON query parameter.

### Core Parameters

| Parameter                  | Type   | Required       | Description                                                      | Example     |
| -------------------------- | ------ | -------------- | ---------------------------------------------------------------- | ----------- |
| `COMPULIFEAUTHORIZATIONID` | string | **YES** (query) | API authorization ID                                             | `5559BA274` |
| `REMOTE_IP`                | string | NO (query)     | Pass `null` for server-side calls                                | `null`      |
| `FaceAmount`               | number | **YES**        | Coverage amount in dollars                                       | `5000000`   |
| `State`                    | 1-51   | **YES**        | Compulife numeric state code                                     | `5` (CA)    |
| `ZipCode`                  | string | NO             | Zip code (alternative to State — overrides State if both provided) | `90210`     |
| `BirthYear`                | number | **YES**        | 4-digit birth year                                               | `1980`      |
| `BirthMonth`               | 1-12   | **YES**        | Birth month                                                      | `6`         |
| `Birthday`                 | 1-31   | **YES**        | Birth day                                                        | `15`        |
| `ActualAge`                | string | NO             | Override actual age calculation                                   | `""`        |
| `NearestAge`               | string | NO             | Override nearest age calculation                                  | `""`        |
| `Sex`                      | M/F    | **YES**        | Gender                                                           | `M`         |
| `Smoker`                   | Y/N    | **YES**        | Tobacco status                                                   | `N`         |
| `Health`                   | string | **YES**        | Health/rate class code                                           | `PP`        |
| `NewCategory`              | string | **YES**        | Product category code                                            | `5`         |

### Output & Filtering Parameters

| Parameter       | Type   | Required | Description                                                                          | Example      |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------ | ------------ |
| `ModeUsed`      | string | NO       | Premium modes: `M` (monthly only), `ALL` (annual + monthly + quarterly + semi-annual) | `ALL`        |
| `MaxNumResults` | number | NO       | Limit results per category                                                           | `3`          |
| `SortOverride1` | string | NO       | Sort override                                                                        | `""`         |
| `CompRating`    | string | NO       | Filter by minimum AM Best rating (`"1"`-`"6"`, where `"4"` ≈ A-rated minimum)       | `"4"`        |
| `ErrOnMissingZipCode` | string | NO | Set to `"ON"` to return error if `ZipCode` not found in database                   | `"ON"`       |
| `COMPINC`       | string | NO       | Include only these companies (comma-separated CompCodes)                             | `"BANN,SYML"` |
| `PRODDIS`       | string | NO       | Exclude specific products (CategoryLetter+ProdCode)                                  | `"5BONN"`    |
| `LANGUAGE`      | string | NO       | `""` for English, `"F"` for French (requires French data files)                      | `""`         |

> **Note:** `LANGUAGE="F"` requires French data files on the server. The dev API does not have them — omit this parameter to avoid `COMPANYF.DAT does not exist` errors.

### Build Chart Parameters

| Parameter | Type   | Required | Description       | Example |
| --------- | ------ | -------- | ----------------- | ------- |
| `Feet`    | string | NO       | Height feet       | `5`     |
| `Inches`  | string | NO       | Height inches     | `10`    |
| `Weight`  | string | NO       | Weight in pounds  | `180`   |

> Used by the Health Analyzer for build chart evaluation. When provided, carriers can assess BMI-based rate class eligibility.

### Health Analyzer — Tobacco Detail

These fields provide granular tobacco usage data for the Health Analyzer's per-carrier go/no-go assessment. All are optional — the basic `Smoker` field (Y/N) is sufficient for standard quoting.

| Parameter                    | Type | Description                                |
| ---------------------------- | ---- | ------------------------------------------ |
| `DoSmokingTobacco`           | Y/N  | Enable tobacco detail section               |
| `DoCigarettes`               | Y/N  | Uses cigarettes                             |
| `PeriodCigarettes`           | string | Period since last cigarette use            |
| `NumCigarettes`              | string | Number of cigarettes per period            |
| `DoCigars`                   | Y/N  | Uses cigars                                 |
| `PeriodCigars`               | string | Period since last cigar use                |
| `NumCigars`                  | string | Number of cigars per period                |
| `DoPipe`                     | Y/N  | Uses pipe tobacco                           |
| `PeriodPipe`                 | string | Period since last pipe use                 |
| `DoChewingTobacco`           | Y/N  | Uses chewing tobacco                        |
| `PeriodChewingTobacco`       | string | Period since last chewing tobacco use      |
| `DoNicotinePatchesOrGum`     | Y/N  | Uses nicotine patches/gum                   |
| `PeriodNicotinePatchesOrGum` | string | Period since last nicotine patch/gum use   |

### Health Analyzer — Blood Pressure

| Parameter                            | Type   | Description                              |
| ------------------------------------ | ------ | ---------------------------------------- |
| `DoBloodPressure`                    | Y/N    | Enable blood pressure section            |
| `BloodPressureMedication`            | Y/N    | Currently on BP medication               |
| `Systolic`                           | string | Systolic reading (top number)            |
| `Dystolic`                           | string | Diastolic reading (bottom number)        |
| `PeriodBloodPressure`                | string | Period since last elevated BP reading    |
| `PeriodBloodPressureControlDuration` | string | How long BP has been controlled          |

### Health Analyzer — Cholesterol

| Parameter                           | Type   | Description                              |
| ----------------------------------- | ------ | ---------------------------------------- |
| `DoCholesterol`                     | Y/N    | Enable cholesterol section               |
| `CholesterolMedication`             | Y/N    | Currently on cholesterol medication      |
| `CholesterolLevel`                  | string | Total cholesterol level                  |
| `HDLRatio`                          | string | Total cholesterol / HDL ratio            |
| `PeriodCholesterol`                 | string | Period since last elevated reading       |
| `PeriodCholesterolControlDuration`  | string | How long cholesterol has been controlled |

### Health Analyzer — Driving History

| Parameter                  | Type   | Description                        |
| -------------------------- | ------ | ---------------------------------- |
| `DoDriving`                | Y/N    | Enable driving history section     |
| `HadDriversLicense`        | Y/N    | Has a driver's license             |
| `DwiConviction`            | Y/N    | DWI conviction                     |
| `PeriodDwiConviction`      | string | Period since DWI conviction        |
| `RecklessConviction`       | Y/N    | Reckless driving conviction        |
| `PeriodRecklessConviction` | string | Period since reckless conviction   |
| `SuspendedConviction`      | Y/N    | License suspended                  |
| `PeriodSuspendedConviction`| string | Period since suspension            |
| `MoreThanOneAccident`      | Y/N    | More than one accident             |
| `PeriodMoreThanOneAccident`| string | Period since multiple accidents    |
| `MovingViolations0`        | string | Moving violations count (tier 0)   |
| `MovingViolations1`        | string | Moving violations count (tier 1)   |
| `MovingViolations2`        | string | Moving violations count (tier 2)   |
| `MovingViolations3`        | string | Moving violations count (tier 3)   |
| `MovingViolations4`        | string | Moving violations count (tier 4)   |

### Health Analyzer — Family History

Supports up to 6 family members: 3 deceased (`00`-`02`) and 3 who contracted disease (`10`-`12`).

| Parameter        | Type | Description                                      |
| ---------------- | ---- | ------------------------------------------------ |
| `DoFamily`       | Y/N  | Enable family history section                    |
| `NumDeaths`      | 0-3  | Number of deceased family members to report      |
| `NumContracted`  | 0-3  | Number of family members who contracted disease  |

**Per-member fields** (suffix `00`/`01`/`02` for deceased, `10`/`11`/`12` for contracted):

| Parameter              | Type | Description                          |
| ---------------------- | ---- | ------------------------------------ |
| `AgeDied{XX}`          | string | Age at death (deceased members only) |
| `AgeContracted{XX}`    | string | Age when disease contracted          |
| `IsParent{XX}`         | Y/N  | Is a parent (vs. sibling)            |
| `CVD{XX}`              | Y/N  | Cardiovascular disease               |
| `CAD{XX}`              | Y/N  | Coronary artery disease              |
| `CVI{XX}`              | Y/N  | Cerebrovascular incident             |
| `CVA{XX}`              | Y/N  | Cerebrovascular accident (stroke)    |
| `Diabetes{XX}`         | Y/N  | Diabetes                             |
| `KidneyDisease{XX}`    | Y/N  | Kidney disease                       |
| `ColonCancer{XX}`      | Y/N  | Colon cancer                         |
| `IntestinalCancer{XX}` | Y/N  | Intestinal cancer                    |
| `BreastCancer{XX}`     | Y/N  | Breast cancer                        |
| `ProstateCancer{XX}`   | Y/N  | Prostate cancer                      |
| `OvarianCancer{XX}`    | Y/N  | Ovarian cancer                       |
| `OtherInternalCancer{XX}` | Y/N | Other internal cancer               |
| `MalignantMelanoma{XX}`| Y/N  | Malignant melanoma                   |
| `BasalCellCarcinoma{XX}`| Y/N | Basal cell carcinoma                 |

### Health Analyzer — Substance Abuse

| Parameter                  | Type   | Description                      |
| -------------------------- | ------ | -------------------------------- |
| `DoSubAbuse`               | Y/N    | Enable substance abuse section   |
| `Alcohol`                  | Y/N    | Alcohol abuse history            |
| `AlcYearsSinceTreatment`   | string | Years since alcohol treatment    |
| `Drugs`                    | Y/N    | Drug abuse history               |
| `DrugsYearsSinceTreatment` | string | Years since drug treatment       |

### Health Analyzer — Display Configuration

These control how the Health Analyzer results are rendered. Used for HTML output — not relevant for JSON API consumption, but included for completeness.

| Parameter          | Type   | Description                              | Default              |
| ------------------ | ------ | ---------------------------------------- | -------------------- |
| `GoColor`          | string | CSS color for "eligible" results         | `"green"`            |
| `NoGoColor`        | string | CSS color for "ineligible" results       | `"yellow"`           |
| `DoNotKnowColor`   | string | CSS color for "unknown" results          | `"red"`              |
| `GoString`         | string | Image URL for eligible indicator         | Compulife CDN URL    |
| `NoGoString`       | string | Image URL for ineligible indicator       | Compulife CDN URL    |
| `DoNotKnowString`  | string | Image URL for unknown indicator          | Compulife CDN URL    |
| `GoMessage`        | string | Tooltip for eligible results             | `"Based upon what you told..."` |
| `DoNotKnowMessage` | string | Tooltip for unknown results              | `"The Health Analyzer does not have enough..."` |
| `NoRedX`           | string | Suppress red X indicators                | `""`                 |
| `SortByHealth`     | Y/N    | Sort results by health eligibility first | `""`                 |
| `RejectReasonBr`   | string | Show rejection reasons with line breaks  | `""`                 |

### State Code Mapping (from live `/api/StateList/` — verified 2026-03-06)

```
AL=1   AK=2   AZ=3   AR=4   CA=5   CO=6   CT=7   DE=8   DC=9   FL=10
GA=11  HI=12  ID=13  IL=14  IN=15  IA=16  KS=17  KY=18  LA=19  ME=20
MD=21  MA=22  MI=23  MN=24  MS=25  MO=26  MT=27  NE=28  NV=29  NH=30
NJ=31  NM=32  NY(Biz)=33  NC=34  ND=35  OH=36  OK=37  OR=38  PA=39  RI=40
SC=41  SD=42  TN=43  TX=44  UT=45  VT=46  VA=47  WA=48  WV=49  WI=50
WY=51  NY(Non-Biz)=52  GU=53  PR=54  VI=55  AS=56
```

> **Key findings from live data:**
>
> - **New York is split:** `33` = "NY Business", `52` = "NY Non-Bus" (different rate tables for business vs personal policies)
> - **US Territories included:** Guam (53), Puerto Rico (54), Virgin Islands (55), American Samoa (56)
> - **Our code maps `NY=33` only** — may need to handle the NY Business/Non-Business distinction
> - DC listed as "Dist.Columbia" in API response

### StateList Endpoint (Public)

Returns all US states/territories with Compulife numeric codes. No auth required.

```
GET https://compulifeapi.com/api/StateList/
```

Response (flat object with numeric string keys — 56 entries):

```json
{
  "1": "Alabama",
  "2": "Alaska",
  "9": "Dist.Columbia",
  "33": "NY Business",
  "52": "NY Non-Bus",
  "53": "Guam",
  "54": "Puerto Rico",
  "55": "Virgin Islands",
  "56": "Amer. Samoa"
}
```

---

## Health Codes

### Standard Rate Classes

| Code | Label          | Description                                      |
| ---- | -------------- | ------------------------------------------------ |
| `PP` | Preferred Plus | Best rate class — excellent health, no tobacco   |
| `P`  | Preferred      | Good health, minor issues acceptable             |
| `RP` | Regular Plus   | Standard health with some conditions             |
| `R`  | Standard       | Base rate class                                  |

### Table Ratings (Substandard)

| Code       | Surcharge   | Description                        |
| ---------- | ----------- | ---------------------------------- |
| `T1`       | +25%        | Table 1 — mild substandard         |
| `T2`       | +50%        | Table 2                            |
| `T3`       | +75%        | Table 3                            |
| `T4`       | +100%       | Table 4 — double standard rate     |
| `T5`-`T16` | +125%-400% | Progressively worse                |

**Currently used:** PP, P, RP, R (standard classes for rate spread), T1-T4 (table ratings toggle)
**Not yet used:** T5-T16 (severe substandard — rarely needed)

---

## NewCategory Codes (Product Types)

> **Source of truth:** Compulife `/api/CategoryList/` endpoint (verified 2026-03-06).
> Previous versions of this doc contained incorrect mappings — this is now corrected.

### Level Term (Currently Used: 3-7)

| Code | Product Type                    | Term | Used?   |
| ---- | ------------------------------- | ---- | ------- |
| `1`  | 1 Year Level Term               | 1yr  | NO      |
| `3`  | 10 Year Level Term Guaranteed   | 10yr | **YES** |
| `4`  | 15 Year Level Term Guaranteed   | 15yr | **YES** |
| `5`  | 20 Year Level Term Guaranteed   | 20yr | **YES** |
| `6`  | 25 Year Level Term Guaranteed   | 25yr | **YES** |
| `7`  | 30 Year Level Term Guaranteed   | 30yr | **YES** |
| `9`  | 35 Year Level Term Guaranteed   | 35yr | NO      |
| `0`  | 40 Year Level Term Guaranteed   | 40yr | NO      |

> **Note (2026-03-06):** No code `2` (5yr term) exists in live `CompanyProductList` data despite appearing in PHP sample dropdown. Live data shows 34 products for code `1`, 241 for `3`, etc.

### Level-to-Age (Currently Used: T, U, V, A-E)

| Code | Product Type                    | Target Age |
| ---- | ------------------------------- | ---------- |
| `T`  | To Age 65 Level Guaranteed      | 65         |
| `U`  | To Age 70 Level Guaranteed      | 70         |
| `V`  | To Age 75 Level Guaranteed      | 75         |
| `A`  | To Age 80 Level Guaranteed      | 80         |
| `B`  | To Age 85 Level Guaranteed      | 85         |
| `C`  | To Age 90 Level Guaranteed      | 90         |
| `D`  | To Age 95 Level Guaranteed      | 95         |
| `E`  | To Age 100 Level Guaranteed     | 100        |
| `G`  | To Age 105 Level Guaranteed     | 105        |
| `H`  | To Age 110 Level Guaranteed     | 110        |

### Return of Premium (Currently Used: J, K, L, M, W)

| Code | Product Type                  | Term |
| ---- | ----------------------------- | ---- |
| `J`  | 15 Year Return of Premium     | 15yr |
| `K`  | 20 Year Return of Premium     | 20yr |
| `L`  | 25 Year Return of Premium     | 25yr |
| `M`  | 30 Year Return of Premium     | 30yr |
| `W`  | To Age 65 Return of Premium   | —    |

> **Correction (2026-03-06):** Live `CompanyProductList` data confirms only J/K/L/M/W exist. Categories `X`, `Y`, and `N` listed in the PHP sample dropdown do NOT appear in live product data. `Y` is actually Final Expense / GIWL (see below). Only 8 companies offer any ROP products.

### Final Expense / Whole Life

| Code | Product Type                      | Used?                               |
| ---- | --------------------------------- | ----------------------------------- |
| `Y`  | GIWL - Graded Benefit Whole Life  | **NOT YET** — Final expense product |

> **Confirmed (2026-03-06):** Live `CompanyProductList` shows 49 products across 35 companies with `CategoryLetter: "Y"`. Product names include "Final Expense Whole Life", "Graded Benefit", "Senior Choice", etc. This is the category for final expense quoting — typically sold to seniors (ages 50-85, $5k-$50k coverage).

### No-Lapse Universal Life (Currently Used: 8)

| Code | Product Type                      | Used?   |
| ---- | --------------------------------- | ------- |
| `8`  | To Age 121 Level (No Lapse UL)    | **YES** |
| `P`  | To Age 121 Level - Pay to 100     | NO      |
| `Q`  | To Age 121 Level - Pay to 65      | NO      |
| `R`  | To Age 121 Level - 20 Pay         | NO      |
| `S`  | To Age 121 Level - 10 Pay         | NO      |
| `O`  | To Age 121 Level - Single Pay     | NO      |

### Other

| Code | Product Type                                                        |
| ---- | ------------------------------------------------------------------- |
| `F`  | Other Term                                                          |
| `Z`  | Multiple Categories (e.g., `Z:357` = 10yr + 20yr + 30yr in one call) |
| `z`  | Combined Category Analysis                                          |

---

## JSON Response Structure

```json
{
  "licensee": "Compulife API",
  "AccessDate": {
    "month": "March",
    "day": "6th",
    "year": "2026",
    "ambestdate": "Feb 27 2026"
  },
  "Lookup": {
    "state_fromzipcode": "9",
    "Birthdate": { "day": "15", "month": "6", "year": "1980", "NearestAge": "46", "ActualAge": "45" },
    "faceamount": "500000",
    "health": "PP",
    "healthtxt": "Preferred Plus",
    "sex": "M",
    "smoker": "N",
    "category": "5",
    "Sort": "N",
    "Mode": "ALL",
    "FaceAmount": "500000",
    "Health": "PP",
    "MaxNumResults": "3",
    "NewCategory": "5",
    "REMOTE_IP": "null",
    "Smoker": "N",
    "State": "9"
  },
  "Compulife_ComparisonResults": {
    "Compulife_Copyright": "These results are copyright Compulife 2026",
    "Compulife_title": "20 Year Level Term Guaranteed",
    "Compulife_Results": [
      {
        "Compulife_company": "Transamerica Life Insurance Company",
        "Compulife_ambest": "AMB # 06095 A  (2-13-26)",
        "Compulife_amb": "A",
        "Compulife_ambnumber": "06095",
        "Compulife_compprodcode": "TRANTRNP",
        "Compulife_premiumAnnual": "530.00",
        "Compulife_premiumM": "45.05",
        "Compulife_premiumQ": "136.48",
        "Compulife_premiumH": "270.30",
        "Compulife_guar": "gtd",
        "Compulife_product": "Trendsetter Super 20",
        "Compulife_rgpfpp": "P+",
        "Compulife_healthcat": "Preferred Plus Non-Smoker"
      }
    ]
  }
}
```

---

## Response Fields (Per Result)

| Field                    | Type   | Description                                               | We Use?                                            |
| ------------------------ | ------ | --------------------------------------------------------- | -------------------------------------------------- |
| `Compulife_company`      | string | Full carrier name                                         | **YES** — mapped to internal carrier ID via 70+ entry lookup |
| `Compulife_premiumAnnual`| string | Annual premium (parseable float)                          | **YES** -> `annualPremium`                         |
| `Compulife_premiumM`     | string | Monthly premium (parseable float)                         | **YES** -> `monthlyPremium`                        |
| `Compulife_premiumQ`     | string | Quarterly premium (parseable float, or `"n/a"`)           | NO — available when `ModeUsed="ALL"`               |
| `Compulife_premiumH`     | string | Semi-annual premium (parseable float, or `"n/a"`)         | NO — available when `ModeUsed="ALL"`               |
| `Compulife_healthcat`    | string | Full rate class name ("Preferred Plus Non-Smoker")        | **YES** -> `riskClass`                             |
| `Compulife_rgpfpp`       | string | Short rate class code ("P+", "Pf", "R+", "Rg")           | **YES** — fallback for `riskClass`                 |
| `Compulife_product`      | string | Product name (includes eApp, conversion details)          | **YES** -> `productName`                           |
| `Compulife_compprodcode` | string | Internal product code ("TRANTRNP")                        | **YES** -> `productCode`                           |
| `Compulife_guar`         | string | `"gtd"` = guaranteed, `"**"` = illustrated                | **YES** -> `isGuaranteed`                          |
| `Compulife_amb`          | string | AM Best rating letter grade ("A+", "A", "A-")             | **YES** -> `amBestRating` (overrides static data)  |
| `Compulife_ambest`       | string | Full AM Best string with date ("AMB # 06095 A (2-13-26)") | NO — could extract rating date                     |
| `Compulife_ambnumber`    | string | AM Best company number                                    | NO                                                 |
| `Compulife_Copyright`    | string | Legal notice                                              | N/A                                                |

> **Premium modes:** When `ModeUsed` is omitted or `"M"`, only `Compulife_premiumM` and `Compulife_premiumAnnual` are returned. When `ModeUsed="ALL"`, quarterly (`_premiumQ`) and semi-annual (`_premiumH`) are also included. Some carriers return `"n/a"` for quarterly/semi-annual.

### Lookup Metadata

| Field                        | Description                         |
| ---------------------------- | ----------------------------------- |
| `Lookup.Birthdate.NearestAge`| Compulife's calculated nearest age  |
| `Lookup.Birthdate.ActualAge` | Actual age at quote time            |
| `Lookup.healthtxt`           | Full health class label             |
| `AccessDate.ambestdate`      | Last AM Best data file update date  |

---

## What We Currently Use

### Implemented Features

| Feature                 | Phase | How                                                                        |
| ----------------------- | ----- | -------------------------------------------------------------------------- |
| Multi-product per carrier | 1c  | Return all product variants instead of deduplicating to cheapest           |
| Guaranteed badge        | 1a    | Parse `Compulife_guar === "gtd"` -> display "Gtd" / "Illust." badges      |
| Fresh AM Best           | 1b    | Use `Compulife_amb` from API, override static `carriers.ts` data          |
| Rate class spread       | 2     | Parallel calls for PP/P/RP/R -> show pricing at each rate class           |
| Return of Premium       | 3a    | Toggle sends additional call with category J/K/L/M                        |
| Level-to-Age            | 3b    | Dropdown sends call with category T/U/V/A-E based on target age           |
| Table Ratings           | 4     | Toggle fires parallel calls for T1-T4 health codes (substandard pricing)  |
| ROP Level-to-Age        | 5a    | When ROP + term-to-age both enabled, fires W (age 65 only — X/Y don't exist) |
| No-Lapse UL             | 5b    | Toggle fires category `8` call for permanent coverage                     |
| Term Comparison         | 5c    | Toggle fires parallel calls for all 5 standard terms (10/15/20/25/30yr)   |

### Implementation Flow

```
IntakeForm -> QuoteRequest -> POST /api/quote
  |-- Standard term call (categories 3-7)
  |-- Nicotine dual-pricing (smoker + non-smoker parallel calls, if applicable)
  |-- Rate class spread (3 parallel calls for non-primary health classes)
  |-- ROP call (categories J/K/L/M, if includeROP toggle is on)
  |-- Term-to-Age call (categories T/U/V/A-E, if termToAge is set)
  |-- Table rating calls (T1-T4 health codes in parallel, if includeTableRatings toggle is on)
  |-- ROP-to-Age call (category W, if both includeROP and termToAge are set, age 65 only)
  |-- No-Lapse UL call (category 8, if includeUL toggle is on)
  +-- Term comparison calls (categories 3-7 minus current, if compareTerms toggle is on)
-> QuoteResponse { quotes: CarrierQuote[] }
```

### Key Files

| File                              | Purpose                                                              |
| --------------------------------- | -------------------------------------------------------------------- |
| `lib/engine/pricing.ts`           | `PricingProvider` interface, `PricingRequest`, `PricingResult` types  |
| `lib/engine/compulife-provider.ts`| Compulife API integration, state/category mappings, company->carrier ID lookup |
| `lib/engine/pricing-config.ts`    | Provider selection: `CompulifeWithMockFallback` composite            |
| `lib/engine/mock-provider.ts`     | Fallback formula-based pricing                                       |
| `app/api/quote/route.ts`          | Quote orchestration: eligibility + pricing + scoring + rate spread + ROP + TTA |
| `lib/types/quote.ts`              | Domain types: `QuoteRequest`, `CarrierQuote`, `RateClassPrice`       |

### PricingRequest Overrides

Two override fields allow flexible API querying without modifying the main logic:

| Override              | Purpose                                  | Used By                                        |
| --------------------- | ---------------------------------------- | ---------------------------------------------- |
| `healthClassOverride` | Force specific health code (PP/P/RP/R)   | Rate class spread calls                        |
| `categoryOverride`    | Force specific NewCategory code          | ROP calls (J/K/L/M), Term-to-Age calls (T/U/V/A-E) |

---

## Auxiliary API Endpoints

Beyond the main `request` endpoint used for quoting, Compulife exposes several list/lookup endpoints.

### All Endpoints

Base URL: `https://www.compulifeapi.com/api/`

| Endpoint                                          | Auth    | Method | Description                                   |
| ------------------------------------------------- | :-----: | ------ | --------------------------------------------- |
| `StateList`                                       | No      | GET    | US states + territories with codes (1-56)     |
| `ProvinceList`                                    | No      | GET    | Canadian province list                        |
| `CompanyList`                                     | No      | GET    | All US companies with `CompCode`              |
| `CompanyListCanada`                               | No      | GET    | All Canadian companies                        |
| `CompanyLogoList[/small\|medium\|large\|all]`     | No\*    | GET    | Company logos by size (needs browser UA)      |
| `CompanyLogoListCanada[/small\|medium\|large\|all]`| No\*   | GET    | Canadian company logos (needs browser UA)     |
| `ip`                                              | No      | GET    | Returns caller's public IP as JSON            |
| `CategoryList`                                    | **Yes** | GET    | Available product categories                  |
| `CompanyProductList`                              | **Yes** | GET    | All companies + their products (filterable)   |
| `request`                                         | **Yes** | GET    | Run a quote comparison (**currently used**)    |
| `sidebyside`                                      | **Yes** | GET    | Spreadsheet-style year-by-year comparison     |

### CompanyProductList Endpoint

Returns every company and its available products. Useful for discovering product codes (`ProdCode`), filtering/disabling specific products in quote requests, and building company code lookups.

**Request (simple form — works with query param):**

```
GET https://compulifeapi.com/api/CompanyProductList/?COMPULIFEAUTHORIZATIONID={AUTH_ID}
```

**Request (JSON form — supports filtering):**

```
GET https://www.compulifeapi.com/api/CompanyProductList/?COMPULIFE={"COMPULIFEAUTHORIZATIONID":"YOUR_ID"}
```

**Filter by company** (optional `COMPINC` param — comma-separated company codes):

```
GET https://www.compulifeapi.com/api/CompanyProductList/?COMPULIFE={"COMPULIFEAUTHORIZATIONID":"YOUR_ID","COMPINC":"BANN"}
```

> **Note:** Trailing slash on the path is required (301 redirect without it).

Company codes come from the `CompanyList` endpoint (e.g., `BANN` = Banner Life).

**Response structure** (array of companies):

```json
[
  {
    "Name": "Banner Life Insurance Company",
    "CompCode": "BANN",
    "Products": [
      {
        "CategoryLetter": "5",
        "ProdCode": "BONN",
        "Name": "OPTerm 20                               "
      },
      {
        "CategoryLetter": "7",
        "ProdCode": "BONN",
        "Name": "OPTerm 30                               "
      }
    ]
  }
]
```

**Response fields per product:**

| Field                | Description                                      | Maps to                                      |
| -------------------- | ------------------------------------------------ | -------------------------------------------- |
| `Name` (company)     | Full company name                                | Matches `Compulife_company` in quote results |
| `CompCode`           | 4-char company code                              | Matches logo CDN codes                       |
| `CategoryLetter`     | NewCategory code (e.g., `5` = 20yr term)         | Matches our category codes table             |
| `ProdCode`           | Short product code (e.g., `BONN`)                | Combined as `{CategoryLetter}{ProdCode}` for `PRODDIS` filter |
| `Name` (product)     | Human-readable product name (whitespace-padded)  | Display label                                |

#### Live Data Stats (verified 2026-03-06)

**115 companies, 1,863 products total.**

| Category           | Products | Companies | Description                      |
| ------------------ | -------- | --------- | -------------------------------- |
| `5` (20yr term)    | 253      | —         | Most popular term length         |
| `3` (10yr term)    | 241      | —         |                                  |
| `4` (15yr term)    | 230      | —         |                                  |
| `7` (30yr term)    | 221      | —         |                                  |
| `F` (Other term)   | 109      | —         | Non-standard terms (16yr, etc.)  |
| `8` (No-Lapse UL)  | 106      | 54        | Largest permanent product category |
| `6` (25yr term)    | 59       | —         |                                  |
| `S` (UL 10-Pay)    | 55       | —         |                                  |
| `O` (UL Single Pay)| 51       | —         |                                  |
| `R` (UL 20-Pay)    | 50       | —         |                                  |
| `P` (UL Pay-to-100)| 49       | —         |                                  |
| `Y` (Final Expense)| 49       | 35        | Graded benefit WL / GIWL         |
| `Q` (UL Pay-to-65) | 41       | —         |                                  |
| `E` (To Age 100)   | 40       | —         |                                  |
| `C` (To Age 90)    | 40       | —         |                                  |
| `G` (To Age 105)   | 38       | —         |                                  |
| `D` (To Age 95)    | 36       | —         |                                  |
| `H` (To Age 110)   | 34       | —         |                                  |
| `1` (1yr term)     | 34       | —         |                                  |
| `B` (To Age 85)    | 32       | —         |                                  |
| `9` (35yr term)    | 22       | —         |                                  |
| `0` (40yr term)    | 16       | —         |                                  |
| `K` (20yr ROP)     | 13       | —         |                                  |
| `M` (30yr ROP)     | 11       | —         |                                  |
| `A` (To Age 80)    | 8        | —         |                                  |
| `T` (To Age 65)    | 6        | —         |                                  |
| `U` (To Age 70)    | 6        | —         |                                  |
| `J` (15yr ROP)     | 5        | —         |                                  |
| `V` (To Age 75)    | 4        | —         |                                  |
| `L` (25yr ROP)     | 3        | —         |                                  |
| `W` (ROP To 65)    | 1        | 1         | Only Illinois Mutual             |

> **Key finding:** Category `Y` is confirmed as Final Expense / GIWL with 49 products across 35 companies. No `X` or `N` categories exist in live data — only `W` exists for ROP-to-Age.

#### Final Expense (Y) Carriers — 35 Companies

Accendo, American-Amicable, American Equity, American General, Americo, Athene (NY), Baltimore Life, Bankers Fidelity, BetterLife, Capitol Life, CICA, Combined, Encova, Fidelity Life, Forethought, Gerber, Gleaner, Government Personnel Mutual, GTL, Foresters, Lafayette, Liberty Bankers, Madison National, Polish Roman Catholic Union, Royal Arcanum, Royal Neighbors, SBLI (MA), SILAC, Sons of Norway, Standard Life, S.USA, Transamerica, United Farm Family, United Home Life, United of Omaha.

#### ROP (J/K/L/M/W) Carriers — 8 Companies

| Company            | Categories   |
| ------------------ | ------------ |
| AAA Life           | J, K, M      |
| Americo            | J, K, L, M   |
| Assurity           | K, M         |
| Baltimore Life     | K, M         |
| Cincinnati Life    | K, L, M      |
| Illinois Mutual    | K, M, W      |
| United Farm Family | K            |
| United Home Life   | K            |

#### Use cases

- **Product filtering:** `PRODDIS` param in quote requests accepts `{CategoryLetter}{ProdCode}` format (e.g., `5BONN` disables Banner OPTerm 20 from category 5 results)
- **Company filtering:** `COMPINC` param in quote requests accepts comma-separated company codes to include only specific carriers
- **Product catalog:** Build a full map of which carriers offer which product types
- **Carrier mapping validation:** Cross-reference `CompCode` with our `COMPULIFE_COMPANY_TO_CARRIER_ID` lookup
- **Final expense scoping:** 35 carriers with `Y` products ready for final expense feature
- **Logo mapping:** `CompCode` matches the CDN logo path `{CODE}-small.png`

### CompanyList Endpoint (Public)

Returns all US companies with their codes and logo URLs. No auth required. **115 companies** (verified 2026-03-06).

```
GET https://www.compulifeapi.com/api/CompanyList/
```

Response:

```json
[
  {
    "CompCode": "BANN",
    "Name": "Banner Life Insurance Company",
    "Logos": {
      "Small": "https://www.compulifeapi.com/images/logosapi/BANN-small.png",
      "Medium": "https://www.compulifeapi.com/images/logosapi/BANN-medium.png",
      "Large": "https://www.compulifeapi.com/images/logosapi/BANN-large.png"
    }
  }
]
```

**Logo URL format:** `https://www.compulifeapi.com/images/logosapi/{CompCode}-{size}.png`
- Sizes: `small`, `medium`, `large`
- Format: PNG (not GIF as previously documented)
- Separator: dash `-` (not underscore `_`)

### Quote Request Filters (COMPINC / PRODDIS)

Two filter params available on the `request` endpoint:

| Parameter | Format           | Purpose                                                    |
| --------- | ---------------- | ---------------------------------------------------------- |
| `COMPINC` | `"BANN,SYML"`    | **Include only** these companies (by CompCode)             |
| `PRODDIS` | `"5BONN,5PCPP"`  | **Exclude** specific products (CategoryLetter + ProdCode)  |

### Z: Multi-Category Syntax

Single-call comparison across multiple categories:

| Example                      | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `Z:357`                      | 10yr + 20yr + 30yr in one call                       |
| `Z:12345670TUVABCDEGH#10`   | All level term products (max 10 results per category) |
| `Z:JKM`                     | 15yr + 20yr + 30yr ROP                               |
| `Z:JKLMW#10`                | All ROP products (max 10 each)                       |
| `Z:8PQRSO#10`               | All UL products                                      |

The `#N` suffix limits results per category.

---

## What's Available But Not Yet Used

### Health Analyzer (High Value)

The Health Analyzer is Compulife's built-in underwriting pre-qualification system. When health detail fields (tobacco, blood pressure, cholesterol, driving, family history, substance abuse, build chart) are populated in the request, each carrier result includes a **go/no-go/unknown** indicator showing whether the applicant likely qualifies at the quoted rate.

**How it works:**

1. Send health detail fields alongside standard quote parameters
2. Response includes per-carrier eligibility indicators (go = green, no-go = yellow, unknown = red)
3. `SortByHealth` param can sort results by eligibility first
4. `RejectReasonBr` shows rejection reasons per carrier

**Integration opportunity:** Cross-reference with our 137-condition medical intelligence system. The Health Analyzer covers tobacco granularity, BP/cholesterol readings, driving history, family history, and substance abuse — areas where our current system uses binary flags. Could provide real-time carrier-level pre-qualification without maintaining our own underwriting rules for these categories.

**Fields available (all documented above in Request Parameters):**

- **Tobacco:** 13 fields (cigarettes, cigars, pipe, chewing, nicotine replacement — each with frequency/period)
- **Blood pressure:** 6 fields (medication, systolic/diastolic, control duration)
- **Cholesterol:** 6 fields (medication, level, HDL ratio, control duration)
- **Driving:** 15 fields (DWI, reckless, suspension, accidents, moving violations by tier)
- **Family history:** 3 deceased + 3 contracted members, each with 16 disease flags
- **Substance abuse:** 4 fields (alcohol/drugs + years since treatment)
- **Build chart:** 3 fields (feet, inches, weight)

### Other Future Possibilities

| Feature                       | Details                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Side-by-side spreadsheet      | Year-by-year analysis for up to 6 products (guaranteed vs current premiums over time)  |
| Quarterly/semi-annual premiums| Available via `ModeUsed="ALL"` — `Compulife_premiumQ` and `Compulife_premiumH` fields  |
| Policy fee                    | Available via template dollar codes, not in JSON response                              |
| Income Replacement Calculator | Needs assessment tool (not core to quoting)                                            |
| UL Pay Variants               | Categories P (Pay to 100), Q (Pay to 65), R (20 Pay), S (10 Pay), O (Single Pay)      |

### CompanyLogoList Endpoint (Public)

Returns logo URLs for all companies, keyed by CompCode. No auth required but **requires a browser User-Agent** (returns 406 without one).

```bash
curl -A 'Mozilla/5.0' 'https://compulifeapi.com/api/CompanyLogoList/all/'
```

**Size variants:** `/small/`, `/medium/`, `/large/`, `/all/` (returns all three)

**Response (`/all/`):**

```json
{
  "small": {
    "BANN": "https://www.compulifeapi.com/images/logosapi/BANN-small.png",
    "SYML": "https://www.compulifeapi.com/images/logosapi/SYML-small.png"
  },
  "medium": {
    "BANN": "https://www.compulifeapi.com/images/logosapi/BANN-medium.png"
  },
  "large": {
    "BANN": "https://www.compulifeapi.com/images/logosapi/BANN-large.png"
  }
}
```

**Stats (verified 2026-03-07):** 115 logos across all 3 sizes. Format: PNG (not GIF).

**URL pattern:** `https://www.compulifeapi.com/images/logosapi/{CompCode}-{size}.png`

Mapped in `lib/data/carrier-logos.ts` (85 of 115 carriers mapped to internal IDs).

---

## Company Name -> Carrier ID Mapping

The `COMPULIFE_COMPANY_TO_CARRIER_ID` lookup in `compulife-provider.ts` maps 70+ Compulife company names to our internal carrier IDs. Examples:

```
"symetra life insurance company" -> "symetra"
"protective life insurance company" -> "protective"
"american general life insurance company" -> "aig"
"north american company for property and casualty insurance" -> "northamerican"
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
