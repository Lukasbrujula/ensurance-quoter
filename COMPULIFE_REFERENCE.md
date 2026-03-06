# Compulife API Reference

## How It Works
Compulife is a CGI binary, not a REST API. It processes HTTP POST form submissions and returns HTML or JSON. Our proxy at Railway wraps it in a JSON interface.

Proxy URL: stored in COMPULIFE_PROXY_URL env var
Auth: COMPULIFE_PROXY_SECRET env var

## Product Type — NewCategory Parameter

This single parameter controls the product type. There is no separate ProductType variable.

### Term (US)
- 1 = 1 Year Level Term
- 2 = 5 Year Level Term
- 3 = 10 Year Level Term
- 4 = 15 Year Level Term
- 5 = 20 Year Level Term (default)
- 6 = 25 Year Level Term
- 7 = 30 Year Level Term
- 9 = 35 Year Level Term
- 0 = 40 Year Level Term
- F = Other Term

### Term-to-Age (US)
- T = To Age 65, U = To Age 70, V = To Age 75, A = To Age 80
- B = To Age 85, C = To Age 90, D = To Age 95, E = To Age 100
- G = To Age 105, H = To Age 110

### Return of Premium (US)
- J = 15 Year ROP, K = 20 Year ROP, L = 25 Year ROP, M = 30 Year ROP
- W = To Age 65 ROP, X = To Age 70 ROP, Y = To Age 75 ROP, N = Other ROP

### Permanent / No-Lapse UL (US)
- 8 = To Age 121 Level (No Lapse UL)
- P = To Age 121 - Pay to 100
- Q = To Age 121 - Pay to 65
- R = To Age 121 - 20 Pay
- S = To Age 121 - 10 Pay
- O = To Age 121 - Single Pay

### Final Expense (US)
- X = GIWL - Graded Benefit Whole Life ⚠️ UNTESTED via cloud API

### Multi-Category Combo
- Z:357 = runs categories 3, 5, and 7 simultaneously (example)

### Canada Whole Life (different codes — do not mix with US)
- H = WL Guaranteed Life Pay, I = WL Pay to 65, T = WL 25 Pay
- J = WL 20 Pay, K = WL 15 Pay, S = WL 10 Pay

⚠️ IMPORTANT: US and Canada share some letter codes with different meanings. H = "To Age 110 Level Term" in US but "Whole Life Guaranteed Life Pay" in Canada.

## Core Input Variables

All product types (term, UL, GIWL) use the same input parameters:

| Variable | Values | Notes |
|----------|--------|-------|
| State | 1-56 | US states + territories (see compulifeapi.js for full map) |
| BirthMonth | 1-12 | |
| Birthday | 1-31 | |
| BirthYear | 1916-2016 | |
| Sex | M, F | |
| Smoker | Y, N | |
| Health | PP, P, RP, R, T1-T16 | PP=Preferred Plus, P=Preferred, RP=Regular Plus, R=Regular, T1-T16=Table Ratings |
| NewCategory | see above | Product type selector |
| FaceAmount | numeric | Dollar amount. Sample dropdown: $10K-$10M. Minimum $10K in samples — $5K untested |
| ModeUsed | M, Q, H, ALL | Monthly, Quarterly, Semi-Annual, All |
| SortOverride1 | A | Sort by annual premium ascending |
| CompRating | 4 | AM Best rating filter level |
| COMPULIFEAUTHORIZATIONID | string | Auth ID (IP-locked) |
| ZipCode | string | Optional — enables state lookup from zip |
| ErrOnMissingZipCode | ON | Optional — error if zip not found |
| COMPINC | string | Optional — comma-separated company codes to include (filter) |
| PRODDIS | string | Optional — comma-separated product codes to exclude |
| MaxNumResults | number | Optional — limit result count |
| LANGUAGE | E | English (default) |

## Health Analyzer Variables (optional, for detailed underwriting)

Used with the Health Analyzer questionnaire flow. All are optional — basic quotes work without them.

### Tobacco
- DoSmokingTobacco: Y/N (master toggle)
- DoCigarettes, DoCigars, DoPipe, DoChewingTobacco, DoNicotinePatchesOrGum: Y checkbox
- PeriodCigarettes, PeriodCigars, PeriodPipe, PeriodChewingTobacco, PeriodNicotinePatchesOrGum: 0-9 (years since last use)
- NumCigarettes, NumCigars: per day count

### Height/Weight
- DoHeightWeight: Y/N
- Feet: 4-7, Inches: 0-11, Weight: 74-401

### Blood Pressure
- DoBloodPressure: Y/N
- Systolic: 119-251 (-1 = don't know)
- Dystolic: 78-181 (-1 = don't know)
- BloodPressureMedication: Y/N
- PeriodBloodPressure, PeriodBloodPressureControlDuration: 0-9

### Cholesterol
- DoCholesterol: Y/N
- CholesterolLevel: 100-300
- HDLRatio: 2.50-10.00 (-1 = don't know)
- CholesterolMedication: Y/N
- PeriodCholesterol, PeriodCholesterolControlDuration: 0-9

### Driving
- HadDriversLicense: Y/N
- DwiConviction, RecklessConviction, SuspendedConviction, MoreThanOneAccident: Y/N
- PeriodDwiConviction, PeriodRecklessConviction, PeriodSuspendedConviction, PeriodMoreThanOneAccident: 0-9
- MovingViolations0-4: 0-9 (tickets per time period)

### Family History
- DoFamily: Y/N
- NumDeaths, NumContracted: -1 to 3 (-1 = don't know)
- AgeDied00-02, AgeContracted00-12: 0-99
- IsParent00-12: Y/N
- CVD, CAD, CVI, CVA, Diabetes, KidneyDisease, ColonCancer, IntestinalCancer, BreastCancer, ProstateCancer, OvarianCancer, OtherInternalCancer, MalignantMelanoma, BasalCellCarcinoma (each with 00-12 suffix): Y checkbox

### Substance Abuse
- DoSubAbuse: Y/N
- Alcohol: Y/N, AlcYearsSinceTreatment: 0-11
- Drugs: Y/N, DrugsYearsSinceTreatment: 0-11

## Response Format

All product types return the same JSON structure:

```json
{
  "Compulife_ComparisonResults": [
    {
      "Compulife_title": "20 Year Level Term Guaranteed",
      "Compulife_Results": [
        {
          "Compulife_company": "Banner Life Insurance Company",
          "Compulife_product": "OPTerm 20",
          "Compulife_compprodcode": "BONN5BONN",
          "Compulife_amb": "A+",
          "Compulife_ambnumber": "6634",
          "Compulife_ambest": "006634",
          "Compulife_premiumAnnual": "210.00",
          "Compulife_premiumM": "18.38",
          "Compulife_premiumQ": "55.13",
          "Compulife_premiumH": "107.10",
          "Compulife_rgpfpp": "Preferred Plus Non-Smoker",
          "Compulife_healthcat": "PP",
          "HealthAnalysisResult": "go",
          "HealthRejReason": ""
        }
      ]
    }
  ],
  "Lookup": {
    "sex": "M",
    "smoker": "N",
    "health": "PP",
    "healthtxt": "Preferred Plus",
    "faceamount": "500000",
    "state_fromzipcode": "5",
    "NewCategory": "5",
    "Mode": "M",
    "ZipCode": "90210",
    "Birthdate": {
      "day": "15",
      "month": "6",
      "year": "1970",
      "ActualAge": "50",
      "NearestAge": "50"
    }
  },
  "AccessDate": {
    "month": "July",
    "day": "11",
    "year": "2020",
    "ambestdate": "June 26, 2020"
  }
}
```

## API Endpoints

Base URL: `https://www.compulifeapi.com/api/`

| Endpoint | Auth Required | Description |
|----------|:---:|-------------|
| StateList | No | US state list with codes |
| ProvinceList | No | Canadian province list |
| CompanyList | No | All US companies with CompCode |
| CompanyListCanada | No | All Canadian companies |
| CompanyLogoList[/small\|medium\|large\|all] | No | Company logos |
| CategoryList | Yes | Available product categories |
| CompanyProductList | Yes | All companies + their products |
| request | Yes | Run a quote comparison |
| sidebyside | Yes | Spreadsheet-style comparison |

## Open Questions for Live Testing

1. Does NewCategory=X (GIWL) return results via the cloud API?
2. Does the API accept FaceAmount below $10,000 (e.g., $5,000)?
3. Does GIWL ignore the Health parameter or use it differently?
4. Which carriers appear in GIWL results vs term results?
5. Do the "To Age 121" UL products (8, P, Q, R, S, O) overlap with FE carrier set?
6. Is there a way to query Simplified Issue or Guaranteed Issue separately, or is X the only FE code?
