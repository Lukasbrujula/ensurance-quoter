# Compulife Cloud API Reference

Comprehensive reference for the Compulife cloud API as used in Ensurance. Covers request methods, parameters, response fields, category codes, health codes, Health Analyzer underwriting inputs, and what we currently use vs. what's available.

**Official docs:** https://docs.compulife.com (Postman-hosted)
**Last verified:** 2026-03-11
**Contact:** service@compulife.com / (888) 798-3488

---

## Connection Modes

### Direct Mode (Local Dev)

- Endpoint: `https://compulifeapi.com/api/request/?COMPULIFEAUTHORIZATIONID={AUTH_ID}&REMOTE_IP=null`
- Auth: `COMPULIFEAUTHORIZATIONID` query param (IP-locked on first use)
- `REMOTE_IP=null` bypasses IP forwarding (uses caller's IP for auth)
- Set `COMPULIFE_AUTH_ID` env var

### Proxy Mode (Production/Vercel)

- Endpoint: `{COMPULIFE_PROXY_URL}/api/quote`
- Auth: `x-proxy-secret` header
- Set `COMPULIFE_PROXY_URL` + `COMPULIFE_PROXY_SECRET` env vars
- DigitalOcean Droplet proxy with fixed outbound IP (Vercel has dynamic IPs)

### Error Handling

Both `COMPULIFE_AUTH_ID` or `COMPULIFE_PROXY_URL` must be set. If Compulife is unreachable, the quote returns a 503 "Pricing service unavailable" error. No fallback pricing exists.

---

## Request Methods

The API supports **two methods** for the `/api/request` endpoint:

### Method 1: POST with form-data body (official canonical method)

```bash
curl --location 'https://compulifeapi.com/api/request/?COMPULIFEAUTHORIZATIONID={ID}&REMOTE_IP=null' \
--form 'State="5"' \
--form 'BirthMonth="6"' \
--form 'Birthday="15"' \
--form 'BirthYear="1980"' \
--form 'Sex="M"' \
--form 'Smoker="N"' \
--form 'Health="PP"' \
--form 'NewCategory="5"' \
--form 'FaceAmount="500000"' \
--form 'ModeUsed="ALL"'
```

### Method 2: GET with JSON in COMPULIFE query parameter (our implementation)

```
GET https://compulifeapi.com/api/request/?COMPULIFEAUTHORIZATIONID={id}&REMOTE_IP=null&COMPULIFE={url_encoded_json}
```

Both methods return the same JSON response. Our code uses Method 2 (GET + JSON query param).

> **Note:** All values in the JSON object are **strings**, even numeric ones like `"500000"`.

> **Note:** The GET method example includes `"UserLocation": "json"` — may control response format. Not yet tested in our implementation.

---

## Request Parameters

### Core Parameters

| Parameter                  | Type   | Required        | Description                                                      | Example     |
| -------------------------- | ------ | --------------- | ---------------------------------------------------------------- | ----------- |
| `COMPULIFEAUTHORIZATIONID` | string | **YES** (query) | API authorization ID                                             | `5559BA274` |
| `REMOTE_IP`                | string | NO (query)      | End-user IP for anti-scraping. Pass `null` for server-side calls | `null`      |
| `FaceAmount`               | number | **YES**         | Coverage amount in dollars                                       | `500000`    |
| `State`                    | 1-56   | **YES**         | Compulife numeric state code. **Must be `0` if using ZipCode**   | `5` (CA)    |
| `ZipCode`                  | string | NO              | Zip code (alternative to State — State must be `0` if provided)  | `90210`     |
| `BirthYear`                | number | **YES**         | 4-digit birth year                                               | `1980`      |
| `BirthMonth`               | 1-12   | **YES**         | Birth month                                                      | `6`         |
| `Birthday`                 | 1-31   | **YES**         | Birth day                                                        | `15`        |
| `ActualAge`                | string | NO              | Override actual age calculation                                   | `""`        |
| `NearestAge`               | string | NO              | Override nearest age calculation                                  | `""`        |
| `Sex`                      | M/F    | **YES**         | Gender                                                           | `M`         |
| `Smoker`                   | Y/N    | **YES**         | Tobacco status                                                   | `N`         |
| `Health`                   | string | **YES**         | Health/rate class code                                           | `PP`        |
| `NewCategory`              | string | **YES**         | Product category code                                            | `5`         |
| `ModeUsed`                 | string | **YES**         | Premium modes: `M` (monthly), `Q` (quarterly), `H` (semi-annual), `ALL` (all four) | `ALL` |

### Output & Filtering Parameters

| Parameter       | Type   | Required | Description                                                                          | Example      |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------ | ------------ |
| `MaxNumResults` | number | NO       | Limit results per category                                                           | `3`          |
| `SortOverride1` | string | NO       | Sort: `A` (annual), `M` (monthly), `N` (none)                                       | `"A"`        |
| `CompRating`    | string | NO       | Filter by minimum AM Best rating (`"1"`-`"15"`, or `"16"` = quote all at best rating) | `"4"`       |
| `ErrOnMissingZipCode` | string | NO | Set to `"ON"` to return error if `ZipCode` not found in database                   | `"ON"`       |
| `COMPINC`       | string | NO       | Include only these companies (comma-separated CompCodes, no spaces)                  | `"BANN,SYML"` |
| `PRODDIS`       | string | NO       | Exclude specific products (CategoryLetter+ProdCode, comma-separated)                 | `"5BONN"`    |
| `LANGUAGE`      | string | NO       | `""` or `"E"` for English, `"F"` for French (requires French data files)             | `""`         |

> **Note:** `LANGUAGE="F"` requires French data files on the server. The dev API does not have them — omit this parameter to avoid `COMPANYF.DAT does not exist` errors.

> **Note:** `#N` suffix works on individual categories too (e.g., `3#5` limits 10yr term to 5 results), not just with `Z:` multi-category syntax.

### CompRating Values (Full Scale)

| Value | AM Best Rating |
|-------|---------------|
| 1 | A++ Superior |
| 2 | A+ Superior |
| 3 | A Excellent |
| 4 | A- Excellent |
| 5 | B++ Very Good |
| 6 | B+ Very Good |
| 7 | B Adequate |
| 8 | B- Adequate |
| 9 | C++ Fair |
| 10 | C+ Fair |
| 11 | C Marginal |
| 12 | C- Marginal |
| 13 | D Very Vulnerable |
| 14 | E Under State Supervision |
| 15 | F In Liquidation |
| **16** | **Quote all with Best Rating** |

> Value `16` returns each carrier at their best available rating instead of filtering by minimum.

### Build Chart Parameters

| Parameter | Type   | Required | Description       | Example |
| --------- | ------ | -------- | ----------------- | ------- |
| `Feet`    | string | NO       | Height feet (4-7) | `5`     |
| `Inches`  | string | NO       | Height inches (0-12) | `10` |
| `Weight`  | string | NO       | Weight in pounds (75-400) | `180` |

> Used by the Health Analyzer for build chart evaluation. Requires `DoHeightWeight: "ON"` toggle.

---

## Health Analyzer

The Health Analyzer is Compulife's built-in underwriting pre-qualification system ($60/yr add-on). When health detail fields are populated, each carrier result includes a **go/nogo/dk** indicator showing whether the applicant likely qualifies at the quoted rate.

**How it works:**

1. Send health detail fields alongside standard quote parameters
2. Response includes per-carrier eligibility: `HealthAnalysisResult` = `"go"` | `"nogo"` | `"dk"`
3. `SortByHealth: "ON"` sorts results by eligibility first
4. `RejectReasonBr: "ON"` shows rejection reasons per carrier via `HealthRejReason`

### Section Toggle Convention

Each Health Analyzer section has a master toggle. **Section toggles use `ON`/`OFF`** (not `Y`/`N`). Individual boolean fields within sections (e.g., `BloodPressureMedication`, `DwiConviction`) use `Y`/`N`.

Toggles that use `ON`/`OFF`: `DoHeightWeight`, `DoSmokingTobacco`, `DoCigarettes`, `DoCigars`, `DoPipe`, `DoChewingTobacco`, `DoNicotinePatchesOrGum`, `DoBloodPressure`, `DoCholesterol`, `DoDriving`, `DoFamily`, `DoSubAbuse`, `NoRedX`, `SortByHealth`, `RejectReasonBr`.

### Tobacco Detail

| Parameter                    | Type   | Description                                |
| ---------------------------- | ------ | ------------------------------------------ |
| `DoSmokingTobacco`           | ON/OFF | Master toggle for tobacco detail section   |
| `DoCigarettes`               | ON/OFF | Uses cigarettes                            |
| `PeriodCigarettes`           | 0-9    | Period since last cigarette use (see Period Scale) |
| `NumCigarettes`              | 1-99   | Average cigarettes per day                 |
| `DoCigars`                   | ON/OFF | Uses cigars                                |
| `PeriodCigars`               | 0-9    | Period since last cigar use                |
| `NumCigars`                  | 1-99   | Average cigars per day                     |
| `DoPipe`                     | ON/OFF | Uses pipe tobacco                          |
| `PeriodPipe`                 | 0-9    | Period since last pipe use                 |
| `DoChewingTobacco`           | ON/OFF | Uses chewing tobacco                       |
| `PeriodChewingTobacco`       | 0-9    | Period since last chewing tobacco use      |
| `DoNicotinePatchesOrGum`     | ON/OFF | Uses nicotine patches/gum                  |
| `PeriodNicotinePatchesOrGum` | 0-9    | Period since last nicotine patch/gum use   |

### Period Scale (Tobacco, Blood Pressure, Cholesterol, Driving)

Non-linear coded ranges — NOT simple year counts:

| Value | Meaning |
|-------|---------|
| `0` | 6 months or less |
| `1` | 1 year or less |
| `2` | 2 years or less |
| `3` | 3 years or less |
| `4` | 4 years or less |
| `5` | 5 years or less |
| `6` | 7 years or less |
| `7` | 10 years or less |
| `8` | 15 years or less |
| `9` | More than 15 years |

> Note the gaps: value 6 = 7 years, value 7 = 10 years, value 8 = 15 years.

### Blood Pressure

| Parameter                            | Type   | Description                              |
| ------------------------------------ | ------ | ---------------------------------------- |
| `DoBloodPressure`                    | ON/OFF | Master toggle for blood pressure section |
| `BloodPressureMedication`            | Y/N    | Currently on BP medication               |
| `Systolic`                           | 120-250 | Systolic reading. `119` = "less than 120". `-1` = "don't know" |
| `Dystolic`                           | 80-180 | Diastolic reading. `79` = "less than 80". `-1` = "don't know"  |
| `PeriodBloodPressure`                | 0-9    | Period since last elevated BP reading (see Period Scale) |
| `PeriodBloodPressureControlDuration` | 0-9    | How long BP has been controlled (see Period Scale) |

> **Note:** Official API spells it `Dystolic` (not Diastolic). Use the misspelled version.

### Cholesterol

| Parameter                           | Type    | Description                              |
| ----------------------------------- | ------- | ---------------------------------------- |
| `DoCholesterol`                     | ON/OFF  | Master toggle for cholesterol section    |
| `CholesterolMedication`             | Y/N     | Currently on cholesterol medication      |
| `CholesterolLevel`                  | 100-300 | Total cholesterol level. `-1` = "don't know" |
| `HDLRatio`                          | 2.50-10.00 | Total cholesterol / HDL ratio. `-1` = "don't know" |
| `PeriodCholesterol`                 | 0-9     | Period since last elevated reading (see Period Scale) |
| `PeriodCholesterolControlDuration`  | 0-9     | How long cholesterol has been controlled (see Period Scale) |

### Driving History

| Parameter                  | Type   | Description                        |
| -------------------------- | ------ | ---------------------------------- |
| `DoDriving`                | ON/OFF | Master toggle for driving section  |
| `HadDriversLicense`        | Y/N    | Has a driver's license (if `N`, all other driving fields ignored) |
| `DwiConviction`            | Y/N    | DWI conviction                     |
| `PeriodDwiConviction`      | 0-9    | Period since DWI conviction (see Period Scale) |
| `RecklessConviction`       | Y/N    | Reckless driving conviction        |
| `PeriodRecklessConviction` | 0-9    | Period since reckless conviction   |
| `SuspendedConviction`      | Y/N    | License suspended                  |
| `PeriodSuspendedConviction`| 0-9    | Period since suspension            |
| `MoreThanOneAccident`      | Y/N    | More than one accident             |
| `PeriodMoreThanOneAccident`| 0-9    | Period since accident preceding most recent |

#### Moving Violations (by time window)

| Parameter | Time Window | Values |
|-----------|------------|--------|
| `MovingViolations0` | Last 6 months | `0`-`9` tickets |
| `MovingViolations1` | 6 months to 1 year ago | `0`-`9` tickets |
| `MovingViolations2` | 1 to 2 years ago | `0`-`9` tickets |
| `MovingViolations3` | 2 to 3 years ago | `0`-`9` tickets |
| `MovingViolations4` | 3 to 5 years ago | `0`-`9` tickets |

> Moving violations only — not parking tickets.

### Family History

Supports up to 6 family members: 3 deceased (`00`-`02`) and 3 who contracted disease (`10`-`12`).

| Parameter        | Type   | Description                                      |
| ---------------- | ------ | ------------------------------------------------ |
| `DoFamily`       | ON/OFF | Master toggle for family history section         |
| `NumDeaths`      | -1 to 3 | Deceased family members (-1 = don't know)       |
| `NumContracted`  | -1 to 3 | Family members who contracted disease (-1 = don't know) |

**Per-member fields** (suffix `00`/`01`/`02` for deceased, `10`/`11`/`12` for contracted):

| Parameter              | Type | Description                          |
| ---------------------- | ---- | ------------------------------------ |
| `AgeDied{XX}`          | 0-99 | Age at death (deceased members only) |
| `AgeContracted{XX}`    | 0-99 | Age when disease contracted          |
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

Total: 14 disease flags x 6 members = 84 family history disease fields.

> **Note:** Contracted members (10-12) do NOT have `AgeDied` fields since they're alive.

### Substance Abuse

| Parameter                  | Type   | Description                      |
| -------------------------- | ------ | -------------------------------- |
| `DoSubAbuse`               | ON/OFF | Master toggle for substance abuse section |
| `Alcohol`                  | Y/N    | Alcohol abuse history            |
| `AlcYearsSinceTreatment`   | 0-11   | Time since alcohol treatment (see Substance Abuse Period Scale) |
| `Drugs`                    | Y/N    | Drug abuse history               |
| `DrugsYearsSinceTreatment` | 0-11   | Time since drug treatment (see Substance Abuse Period Scale) |

#### Substance Abuse Period Scale

Different from the standard Period Scale — goes to 11 (not 9) and uses year-based ranges:

| Value | Meaning |
|-------|---------|
| `0` | 1 year or less |
| `1` | Less than 2 years (1 year or more) |
| `2` | Less than 3 years |
| `3` | Less than 4 years |
| `4` | Less than 5 years |
| `5` | Less than 6 years |
| `6` | Less than 7 years |
| `7` | Less than 8 years |
| `8` | Less than 9 years |
| `9` | Less than 10 years |
| `10` | Less than 20 years (10 years or more) |
| `11` | More than 20 years |

### Display Configuration (HTML rendering)

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
| `NoRedX`           | ON/OFF | Filter out ineligible results entirely   | `"OFF"`              |
| `SortByHealth`     | ON/OFF | Sort results by health eligibility first | `"OFF"`              |
| `RejectReasonBr`   | ON/OFF | Show rejection reasons with line breaks  | `"OFF"`              |

---

## State Code Mapping (verified from `/api/StateList/` — 2026-03-06)

56 entries: 51 states + DC + NY split + 4 territories.

```
AL=1   AK=2   AZ=3   AR=4   CA=5   CO=6   CT=7   DE=8   DC=9   FL=10
GA=11  HI=12  ID=13  IL=14  IN=15  IA=16  KS=17  KY=18  LA=19  ME=20
MD=21  MA=22  MI=23  MN=24  MS=25  MO=26  MT=27  NE=28  NV=29  NH=30
NJ=31  NM=32  NY(Biz)=33  NC=34  ND=35  OH=36  OK=37  OR=38  PA=39  RI=40
SC=41  SD=42  TN=43  TX=44  UT=45  VT=46  VA=47  WA=48  WV=49  WI=50
WY=51  NY(Non-Biz)=52  GU=53  PR=54  VI=55  AS=56
```

> **Key notes:**
> - **New York is split:** `33` = "NY Business", `52` = "NY Non-Bus" (different rate tables)
> - **US Territories:** Guam (53), Puerto Rico (54), Virgin Islands (55), American Samoa (56)
> - **Our code maps `NY=33` only** — may need to handle the NY Business/Non-Business distinction
> - DC listed as "Dist.Columbia" in API response

---

## Health Codes

### Standard Rate Classes

| Code | Label          | Description                                      |
| ---- | -------------- | ------------------------------------------------ |
| `PP` | Preferred Plus | Best rate class — excellent health, no tobacco   |
| `P`  | Preferred      | Good health, minor issues acceptable             |
| `RP` | Regular Plus   | Standard health with some conditions             |
| `R`  | Standard       | Base rate class                                  |

### Table Ratings (Substandard — US only)

| Code       | Surcharge   | Description                        |
| ---------- | ----------- | ---------------------------------- |
| `T1`       | +25%        | Table 1 (A) — mild substandard    |
| `T2`       | +50%        | Table 2 (B)                       |
| `T3`       | +75%        | Table 3 (C)                       |
| `T4`       | +100%       | Table 4 (D) — double standard rate |
| `T5`-`T16` | +125%-400% | Progressively worse                |

**Currently used:** PP, P, RP, R (standard classes for rate spread), T1-T4 (table ratings toggle)
**Not yet used:** T5-T16 (severe substandard — rarely needed)

---

## NewCategory Codes (Product Types)

> **Source of truth:** Compulife `/api/CategoryList/` endpoint (verified 2026-03-11).

### Level Term (Currently Used: 3-7)

| Code | Product Type                    | Term | Used?   |
| ---- | ------------------------------- | ---- | ------- |
| `1`  | 1 Year Level Term               | 1yr  | NO      |
| `2`  | 5 Year Level Term Guaranteed    | 5yr  | NO      |
| `3`  | 10 Year Level Term Guaranteed   | 10yr | **YES** |
| `4`  | 15 Year Level Term Guaranteed   | 15yr | **YES** |
| `5`  | 20 Year Level Term Guaranteed   | 20yr | **YES** |
| `6`  | 25 Year Level Term Guaranteed   | 25yr | **YES** |
| `7`  | 30 Year Level Term Guaranteed   | 30yr | **YES** |
| `9`  | 35 Year Level Term Guaranteed   | 35yr | NO      |
| `0`  | 40 Year Level Term Guaranteed   | 40yr | NO      |

> **Note:** Category `2` (5yr term) confirmed in official CategoryList. Category `1` (1yr term) is NOT in CategoryList but has products in CompanyProductList — may be unlisted/deprecated.

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

> **Important:** Only J/K/L/M/W exist. No X, Y, or N categories for ROP — `Y` is Final Expense (see below), and `W` is the only ROP-to-Age code (age 65 only, 1 carrier: Illinois Mutual).

### Final Expense / Whole Life

| Code | Product Type                      | Used?                               |
| ---- | --------------------------------- | ----------------------------------- |
| `Y`  | GIWL - Graded Benefit Whole Life  | **YES** — Final expense tab |

> Category Y returns ~35 FE products across 35 companies. Products are classified by name into three types: **Level** (immediate full coverage), **Graded** (partial payout years 1-2), **Guaranteed Issue** (no health questions, 2-year waiting period). FE calls use `healthClassOverride: "R"` (Standard) since FE is simplified issue. Of 35 Compulife FE carriers, 16 are currently mapped to our CARRIERS array.

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
| `z`  | Combined Category Analysis (distinct from uppercase `Z`)            |

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
        "Compulife_healthcat": "Preferred Plus Non-Smoker",
        "HealthAnalysisResult": "go",
        "HealthRejReason": ""
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
| `Compulife_premiumAnnual`| string | Annual premium (parseable float, may contain commas at high face amounts) | **YES** -> `annualPremium` |
| `Compulife_premiumM`     | string | Monthly premium (parseable float)                         | **YES** -> `monthlyPremium`                        |
| `Compulife_premiumQ`     | string | Quarterly premium (parseable float, or `"N/A"`)           | NO — available when `ModeUsed="ALL"`               |
| `Compulife_premiumH`     | string | Semi-annual premium (parseable float, or `"N/A"`)         | NO — available when `ModeUsed="ALL"`               |
| `Compulife_healthcat`    | string | Full rate class name ("Preferred Plus Non-Smoker")        | **YES** -> `riskClass`                             |
| `Compulife_rgpfpp`       | string | Short rate class code ("P+", "Pf", "R+", "Rg")           | **YES** — fallback for `riskClass`                 |
| `Compulife_product`      | string | Product name (whitespace-padded — trim before display)    | **YES** -> `productName`                           |
| `Compulife_compprodcode` | string | Internal product code ("TRANTRNP")                        | **YES** -> `productCode`                           |
| `Compulife_guar`         | string | `"gtd"` = guaranteed, `"**"` = illustrated                | **YES** -> `isGuaranteed`                          |
| `Compulife_amb`          | string | AM Best rating letter grade ("A+", "A", "A-")             | **YES** -> `amBestRating` (overrides static data)  |
| `Compulife_ambest`       | string | Full AM Best string with date ("AMB # 06095 A (2-13-26)") | NO — could extract rating date                     |
| `Compulife_ambnumber`    | string | AM Best company number                                    | NO                                                 |
| `Compulife_Copyright`    | string | Legal notice                                              | N/A                                                |
| `HealthAnalysisResult`   | string | `"go"` / `"nogo"` / `"dk"` — Health Analyzer eligibility | **YES** (when HA enabled)                          |
| `HealthRejReason`        | string | Rejection reason text (empty if eligible)                 | **YES** (when HA enabled)                          |

> **Premium parsing:** High face amounts return commas in annual premiums (e.g., `"3,390.00"`). Strip commas before `parseFloat()`.

> **HTML entities:** Company names and health categories may contain HTML entities (`&eacute;` → `é`). Decode before display.

> **Premium modes:** When `ModeUsed` is `"M"`, only `Compulife_premiumM` and `Compulife_premiumAnnual` are returned. When `ModeUsed="ALL"`, quarterly and semi-annual are also included. Some carriers return `"N/A"` for quarterly/semi-annual.

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
| ROP Level-to-Age        | 5a    | When ROP + term-to-age both enabled, fires W (age 65 only)                |
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
| `lib/engine/pricing-config.ts`    | Provider selection: `CompulifePricingProvider`                        |
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
| `ip`                                              | No      | GET    | Returns caller's public IP as JSON            |
| `StateList`                                       | No      | GET    | US states + territories with codes (1-56)     |
| `ProvinceList`                                    | No      | GET    | Canadian province list                        |
| `CompanyList`                                     | No      | GET    | All US companies with `CompCode` + logos      |
| `CompanyListCanada`                               | No      | GET    | All Canadian companies                        |
| `CompanyLogoList[/small\|medium\|large\|all]`     | No\*    | GET    | Company logos by size (needs browser UA)      |
| `CompanyLogoListCanada[/small\|medium\|large\|all]`| No\*   | GET    | Canadian company logos (needs browser UA)     |
| `CategoryList`                                    | **Yes** | GET    | Available product categories                  |
| `CompanyProductList`                              | **Yes** | GET    | All companies + their products (filterable)   |
| `request`                                         | **Yes** | GET/POST | Run a quote comparison (**currently used**)  |
| `sidebyside`                                      | **Yes** | POST   | Spreadsheet-style year-by-year comparison     |

### /api/ip Endpoint (Public)

Returns public IP address — useful for debugging proxy IP whitelisting.

```bash
curl 'https://compulifeapi.com/api/ip/'
# Response: {"IPADDRESS": "YOUR_IP_ADDRESS"}
```

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
- Format: PNG
- Separator: dash `-`
- Mapped in `lib/data/carrier-logos.ts` (85 of 115 carriers mapped to internal IDs)

### CompanyProductList Endpoint

Returns every company and its available products. Useful for discovering product codes, filtering, and building lookups.

**Request:**

```
GET https://compulifeapi.com/api/CompanyProductList/?COMPULIFEAUTHORIZATIONID={AUTH_ID}
```

**Filter by company** (optional `COMPINC` param):

```
GET https://www.compulifeapi.com/api/CompanyProductList/?COMPULIFEAUTHORIZATIONID={ID}&COMPINC=BANN
```

> **Note:** Trailing slash on the path is required (301 redirect without it).

**Response structure:**

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
| `Name` (product)     | Human-readable product name (whitespace-padded)  | Display label — trim before use              |

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

### Quote Request Filters (COMPINC / PRODDIS)

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

### Sidebyside Endpoint

Year-by-year spreadsheet-style comparison. Separate endpoint from quote.

```
POST https://compulifeapi.com/api/sidebyside/?COMPULIFEAUTHORIZATIONID={ID}&REMOTE_IP={IP}
```

Same core params as standard quote, minus `MaxNumResults` and Health Analyzer fields. Response format not yet documented — needs live testing.

### CompanyLogoList Endpoint (Public)

Returns logo URLs for all companies, keyed by CompCode. No auth required but **requires a browser User-Agent** (returns 406 without one).

```bash
curl -A 'Mozilla/5.0' 'https://compulifeapi.com/api/CompanyLogoList/all/'
```

**Size variants:** `/small/`, `/medium/`, `/large/`, `/all/` (returns all three)

**Stats (verified 2026-03-07):** 115 logos across all 3 sizes. Format: PNG.

---

## What's Available But Not Yet Used

### Health Analyzer (High Value)

**Integration opportunity:** Cross-reference with our 137-condition medical intelligence system. The Health Analyzer covers tobacco granularity, BP/cholesterol readings, driving history, family history, and substance abuse — areas where our current system uses binary flags. Could provide real-time carrier-level pre-qualification without maintaining our own underwriting rules for these categories.

**Fields available (all documented above):**

- **Tobacco:** 13 fields (cigarettes, cigars, pipe, chewing, nicotine replacement — each with frequency/period)
- **Blood pressure:** 6 fields (medication, systolic/diastolic, control duration)
- **Cholesterol:** 6 fields (medication, level, HDL ratio, control duration)
- **Driving:** 15 fields (DWI, reckless, suspension, accidents, moving violations by time window)
- **Family history:** 3 deceased + 3 contracted members, each with 14 disease flags
- **Substance abuse:** 4 fields (alcohol/drugs + years since treatment)
- **Build chart:** 3 fields (feet, inches, weight)

### Other Future Possibilities

| Feature                       | Details                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Side-by-side spreadsheet      | Year-by-year analysis for up to 6 products (guaranteed vs current premiums over time)  |
| Quarterly/semi-annual premiums| Available via `ModeUsed="ALL"` — `Compulife_premiumQ` and `Compulife_premiumH` fields  |
| UL Pay Variants               | Categories P (Pay to 100), Q (Pay to 65), R (20 Pay), S (10 Pay), O (Single Pay)      |
| 5 Year Level Term             | Category `2` — officially available but may have few products                          |

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

### Notable CompCode Mappings (from official CompanyList)

| CompCode | Company Name | Notes |
|----------|-------------|-------|
| `INDE` | Independent Order of Foresters | = our `foresters` carrier |
| `JOHU` + `JOHY` | John Hancock (USA + NY) | Both should map to `jh` |
| `AMSV` | Americo Financial Life and Annuity Ins. | = our `americo` carrier |
| `SBLI` + `SAVE` | SBLI USA + Savings Bank Mutual (MA) | Both are SBLI entities |

---

## Rate Limiting & Performance

- Each quote fires 1 primary call + up to 3 rate-spread calls + optional add-ons
- Optional calls: ROP (1), TTA (1), ROP-to-Age (1), Table Ratings (4), UL (1), Term Comparison (4)
- Maximum ~15 parallel calls per quote request (if all toggles enabled)
- Compulife has no documented rate limit, but we cap concurrent calls
- Dual-pricing mode (nicotine classification) skips rate spread to avoid 8+ calls
- All additional calls (ROP, TTA, spread) are non-fatal — wrapped in try/catch

### Pricing Tiers

- $370/yr = 1,200 quotes/month
- $740/yr = 6,000 quotes/month
- $1,110/yr = 30,000 quotes/month
- Over 30,000/mo requires the Internet Quote Engine ($1,920-$3,450/yr)
- Health Analyzer: $60/yr add-on

### Anti-Scraping

- One IP per subscription (additional IPs require additional subscriptions)
- `REMOTE_IP` of end user should be passed to prevent single-user scraping
- A single user exceeding limits gets blocked for 24 hours
- We pass `null` — works for server-side but bypasses user-level throttling

---

## Data Freshness

- Compulife updates carrier data and AM Best ratings **monthly**
- `AccessDate.ambestdate` in response shows last data file date
- Our static `carriers.ts` AM Best data may be stale between manual updates
- Compulife AM Best (`Compulife_amb`) overrides static data when available
