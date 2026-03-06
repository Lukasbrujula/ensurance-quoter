import type { PricingProvider, PricingRequest, PricingResult } from "./pricing"
import { calculateBMI } from "./build-chart"

/**
 * Compulife cloud API pricing provider.
 *
 * Two modes:
 * 1. **Proxy mode** (production/Vercel): routes through a fixed-IP proxy
 *    on Railway. Set COMPULIFE_PROXY_URL + COMPULIFE_PROXY_SECRET.
 * 2. **Direct mode** (local dev): calls compulifeapi.com directly.
 *    Set COMPULIFE_AUTH_ID (IP-locked on first use).
 *
 * Falls back to MockPricingProvider via pricing-config.ts on any error.
 */

// SECURITY: Auth ID is IP-locked by Compulife on first use. The ID alone
// is insufficient for unauthorized access — requests from non-whitelisted
// IPs are rejected. This is the primary access control mechanism.
const COMPULIFE_AUTH_ID = process.env.COMPULIFE_AUTH_ID
const COMPULIFE_PROXY_URL = process.env.COMPULIFE_PROXY_URL?.replace(/\/+$/, "")
const COMPULIFE_PROXY_SECRET = process.env.COMPULIFE_PROXY_SECRET

if (COMPULIFE_PROXY_URL && !COMPULIFE_PROXY_SECRET) {
  throw new Error(
    "COMPULIFE_PROXY_SECRET is required when COMPULIFE_PROXY_URL is set"
  )
}

let modeLogged = false

/** State abbreviations → Compulife numeric codes */
const STATE_ABBR_TO_CODE: Record<string, string> = {
  AL: "1", AK: "2", AZ: "3", AR: "4", CA: "5",
  CO: "6", CT: "7", DE: "8", DC: "9", FL: "10",
  GA: "11", HI: "12", ID: "13", IL: "14", IN: "15",
  IA: "16", KS: "17", KY: "18", LA: "19", ME: "20",
  MD: "21", MA: "22", MI: "23", MN: "24", MS: "25",
  MO: "26", MT: "27", NE: "28", NV: "29", NH: "30",
  NJ: "31", NM: "32", NY: "33", NC: "34", ND: "35",
  OH: "36", OK: "37", OR: "38", PA: "39", RI: "40",
  SC: "41", SD: "42", TN: "43", TX: "44", UT: "45",
  VT: "46", VA: "47", WA: "48", WV: "49", WI: "50",
  WY: "51",
}

/** Full state names → abbreviations (for intake forms that send "Texas" instead of "TX") */
const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC", florida: "FL",
  georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN",
  iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME",
  maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH",
  "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
}

function resolveStateCode(stateInput: string): string | null {
  const trimmed = stateInput.trim()
  const upper = trimmed.toUpperCase()

  // Try abbreviation first (TX, CA, etc.)
  if (STATE_ABBR_TO_CODE[upper]) return STATE_ABBR_TO_CODE[upper]

  // Try full name (Texas, California, etc.)
  const abbr = STATE_NAME_TO_ABBR[trimmed.toLowerCase()]
  if (abbr) return STATE_ABBR_TO_CODE[abbr]

  return null
}

/** Term length → Compulife NewCategory codes. Unsupported terms return null. */
const TERM_TO_CATEGORY: Record<number, string | null> = {
  10: "3",
  15: "4",
  20: "5",
  25: "6",
  30: "7",
  35: null,
  40: null,
}

/** Term length → Compulife ROP (Return of Premium) category codes. */
const TERM_TO_ROP_CATEGORY: Record<number, string | null> = {
  15: "J",
  20: "K",
  25: "L",
  30: "M",
  10: null, // No 10yr ROP available
  35: null,
  40: null,
}

/** Exported for route-level ROP category lookup */
export function getRopCategory(termLength: number): string | null {
  return TERM_TO_ROP_CATEGORY[termLength] ?? null
}

/** Target age → Compulife "ROP to Age X" category codes. Only 65/70/75 available. */
const AGE_TO_ROP_CATEGORY: Record<number, string> = {
  65: "W",
  70: "X",
  75: "Y",
}

/** Exported for route-level ROP-to-age category lookup */
export function getRopToAgeCategory(targetAge: number): string | null {
  return AGE_TO_ROP_CATEGORY[targetAge] ?? null
}

/** Target age → Compulife "Level to Age X" category codes. */
const AGE_TO_CATEGORY: Record<number, string> = {
  65: "T",
  70: "U",
  75: "V",
  80: "A",
  85: "B",
  90: "C",
  95: "D",
  100: "E",
  105: "G",
  110: "H",
}

/** Valid target ages for term-to-age products */
export const TERM_TO_AGE_OPTIONS = [65, 70, 75, 80, 85, 90, 95, 100] as const
export type TermToAge = (typeof TERM_TO_AGE_OPTIONS)[number]

/** Exported for route-level term-to-age category lookup */
export function getTermToAgeCategory(targetAge: number): string | null {
  return AGE_TO_CATEGORY[targetAge] ?? null
}

/**
 * Maps Compulife company names (lowercased) to our internal carrier IDs.
 *
 * Includes exact names from real API responses plus short-form variants
 * for partial match fallback coverage.
 */
const COMPULIFE_NAME_TO_CARRIER_ID: Record<string, string> = {
  // AIG / American General
  "american general life insurance company": "aig",
  "american general": "aig",

  // Foresters
  "independent order of foresters": "foresters",
  "foresters financial": "foresters",
  "foresters life": "foresters",

  // Mutual of Omaha (subsidiary: United of Omaha)
  "united of omaha life insurance company": "moo",
  "mutual of omaha": "moo",

  // John Hancock
  "john hancock life insurance company usa": "jh",
  "john hancock": "jh",
  "john hancock life": "jh",

  // Banner Life / LGA
  "banner life insurance company": "lga",
  "banner life insurance company (ethos)": "lga",
  "banner life": "lga",
  "legal & general": "lga",

  // SBLI
  "savings bank mutual life ins co of ma": "sbli",
  "sbli": "sbli",
  "sbli usa": "sbli",

  // NLG (subsidiary: Life Insurance Company of the Southwest)
  "life insurance company of the southwest": "nlg",
  "national life insurance company": "nlg",
  "national life group": "nlg",
  "life savings": "nlg",

  // Transamerica
  "transamerica life insurance company": "transamerica",
  "transamerica": "transamerica",
  "transamerica life": "transamerica",

  // Americo
  "americo": "americo",
  "americo financial": "americo",

  // American Amicable
  "american amicable": "amam",

  // United Home Life
  "united home life": "uhl",

  // F&G
  "fidelity & guaranty": "fg",

  // Protective
  "protective life insurance company": "protective",
  "protective life": "protective",

  // Corebridge
  "corebridge financial": "corebridge",

  // Lincoln
  "lincoln national life insurance company": "lincoln",
  "lincoln financial": "lincoln",
  "lincoln national": "lincoln",

  // Prudential (subsidiary: Pruco Life)
  "pruco life insurance company": "prudential",
  "prudential financial": "prudential",

  // Nationwide
  "nationwide life and annuity insurance co": "nationwide",
  "nationwide life": "nationwide",

  // Pacific Life
  "pacific life insurance company": "pacific",
  "pacific life": "pacific",

  // Principal
  "principal national life insurance co": "principal",
  "principal financial": "principal",

  // North American
  "north american co for life and health": "northamerican",
  "north american life": "northamerican",

  // Securian (subsidiary: Minnesota Life)
  "minnesota life insurance company": "securian",
  "securian financial": "securian",

  // Global Atlantic
  "global atlantic": "globalatlantic",

  // MassMutual
  "massachusetts mutual life insurance": "massmutual",
  "mass mutual": "massmutual",
  "massmutual": "massmutual",

  // New York Life (subsidiary: NYLIFE of Arizona)
  "nylife insurance company of arizona": "newyorklife",
  "new york life": "newyorklife",

  // Penn Mutual
  "penn mutual life insurance company": "pennmutual",
  "penn mutual life": "pennmutual",
  "penn mutual": "pennmutual",

  // Symetra
  "symetra life insurance company": "symetra",
  "symetra life": "symetra",

  // Brighthouse
  "brighthouse financial": "brighthouse",

  // Gerber
  "gerber life": "gerber",

  // Colonial Penn
  "colonial penn": "colonialpenn",

  // Globe Life
  "globe life": "globelife",

  // ANICO
  "american national": "anico",

  // Kemper
  "kemper life": "kemper",

  // BetterLife
  "betterlife": "betterlife",

  // --- Subsidiary / variant mappings (map to existing carrier IDs) ---

  // Penn Mutual NY subsidiary
  "penn insurance and annuity co of ny": "pennmutual",

  // Principal subsidiary
  "principal life insurance company": "principal",

  // Prudential NJ subsidiary
  "pruco life insurance co of new jersey": "prudential",

  // Securian subsidiary
  "securian life insurance company": "securian",

  // AIG NY subsidiary
  "united states life ins in the city of ny": "aig",

  // --- New carriers from Compulife API ---

  // AAA Life
  "aaa life insurance company": "aaa",
  "aaa life": "aaa",

  // OneAmerica (American United Life)
  "american united life insurance company": "oneamerica",
  "american united life": "oneamerica",

  // Ameritas
  "ameritas life insurance corp": "ameritas",
  "ameritas life insurance corp of new york": "ameritas",
  "ameritas life": "ameritas",

  // Assurity
  "assurity life insurance company": "assurity",
  "assurity life insurance co (hero life)": "assurity",
  "assurity life": "assurity",

  // AuguStar (formerly Ohio National)
  "augustar life assurance corporation": "augustar",
  "augustar life": "augustar",

  // Cincinnati Life
  "cincinnati life insurance company": "cincinnati",
  "cincinnati life": "cincinnati",

  // Columbus Life
  "columbus life insurance company": "columbus",
  "columbus life": "columbus",

  // Equitable (formerly AXA)
  "equitable financial life insurance co": "equitable",
  "equitable financial": "equitable",

  // Fidelity Life Association
  "fidelity life association": "fidelitylife",
  "fidelity life": "fidelitylife",

  // GBU Financial Life
  "gbu financial life": "gbu",

  // Gleaner Life
  "gleaner life insurance society": "gleaner",
  "gleaner life": "gleaner",

  // Grange Life
  "grange life insurance company": "grange",
  "grange life": "grange",

  // Guardian Life
  "guardian life insurance co of america": "guardian",
  "guardian life": "guardian",

  // National Benefit Life (Primerica subsidiary)
  "national benefit life insurance company": "nationalbenefit",
  "national benefit life": "nationalbenefit",

  // National Catholic Society of Foresters
  "national catholic society of foresters": "ncforesters",

  // Security Mutual Life
  "security mutual life insurance co of ny": "securitymutual",
  "security mutual life": "securitymutual",

  // Thrivent
  "thrivent financial for lutherans": "thrivent",
  "thrivent": "thrivent",

  // Trusted Fraternal Life
  "trusted fraternal life insurance company": "trustedfraternal",
  "trusted fraternal": "trustedfraternal",

  // William Penn Life
  "william penn life insurance co of ny": "williampenn",
  "william penn life": "williampenn",

  // Woman's Life Insurance Society
  "woman's life insurance society": "womanslife",
  "woman's life": "womanslife",

  // Illinois Mutual
  "illinois mutual life insurance company": "illinoismutual",
  "illinois mutual": "illinoismutual",

  // GTL
  "guarantee trust life insurance company": "gtl",
  "guarantee trust life": "gtl",

  // Pekin Life
  "pekin life insurance company": "pekin",
  "pekin life": "pekin",

  // American Home Life
  "american home life insurance company": "americanhomelife",
  "american home life": "americanhomelife",

  // Baltimore Life
  "baltimore life insurance company": "baltimore",
  "baltimore life": "baltimore",
}

/**
 * Pre-sorted entries for partial matching — longest keys first
 * so "american general" matches before "american".
 */
const SORTED_MAPPING_ENTRIES = Object.entries(COMPULIFE_NAME_TO_CARRIER_ID)
  .sort(([a], [b]) => b.length - a.length)

function resolveCarrierId(compulifeCompanyName: string): string | null {
  const normalized = compulifeCompanyName.trim().toLowerCase()

  // Exact match first
  const exact = COMPULIFE_NAME_TO_CARRIER_ID[normalized]
  if (exact) return exact

  // Partial match — check if input contains any known key (longest first)
  for (const [key, carrierId] of SORTED_MAPPING_ENTRIES) {
    if (normalized.includes(key)) {
      return carrierId
    }
  }

  return null
}

/** Shape of a single result from the Compulife cloud API */
interface CompulifeResult {
  Compulife_company: string
  Compulife_product: string
  Compulife_premiumAnnual: string
  Compulife_premiumM?: string
  Compulife_amb: string
  Compulife_ambest: string
  Compulife_ambnumber: string
  Compulife_compprodcode: string
  Compulife_guar: string
  Compulife_rgpfpp: string
  Compulife_healthcat: string
}

/** A category grouping (e.g. "20 Year Level Term Guaranteed") */
interface CompulifeCategory {
  Compulife_Copyright: string
  Compulife_title: string
  Compulife_Results: CompulifeResult[]
}

/** Top-level API response */
interface CompulifeApiResponse {
  licensee: string
  AccessDate: Record<string, string>
  Lookup: Record<string, unknown>
  Compulife_ComparisonResults: CompulifeCategory | CompulifeCategory[]
}

/** Coalesced IP promise — prevents concurrent duplicate fetches and retries on failure */
let ipPromise: Promise<string> | null = null

function getPublicIP(): Promise<string> {
  if (!ipPromise) {
    ipPromise = fetch("https://api.ipify.org?format=text", {
      signal: AbortSignal.timeout(5_000),
    })
      .then((res) => res.text())
      .then((text) => text.trim())
      .catch((err) => {
        ipPromise = null
        throw err
      })
  }
  return ipPromise
}

/** Convert age to birth date components (June 15th, `age` years ago) */
function ageToBirthDate(age: number): { BirthYear: string; BirthMonth: string; BirthDay: string } {
  const currentYear = new Date().getFullYear()
  return {
    BirthYear: String(currentYear - age),
    BirthMonth: "6",
    BirthDay: "15",
  }
}

/**
 * Conditions that push the health class to Standard ("R") regardless of BMI.
 * These carry significant mortality risk that disqualifies Preferred tiers.
 */
const SERIOUS_CONDITIONS = new Set([
  "diabetesType1",
  "diabetesType2",
  "copd",
  "cardiac",
  "afib",
  "cancer",
  "hepatitisC",
  "kidneyDisease",
])

/**
 * Minor/controlled conditions — compatible with Regular Plus ("RP") when
 * BMI is in the 25-29 range. Everything not in SERIOUS_CONDITIONS and not
 * in this set is treated as moderate (maps to "R").
 */
const MINOR_CONDITIONS = new Set([
  "highBloodPressure",
  "asthma",
  "anxiety",
  "depression",
  "sleepApnea",
  "hypothyroidism",
])

/**
 * Maps client risk factors to a Compulife health class code.
 *
 * PP = Preferred Plus, P = Preferred, RP = Regular Plus, R = Regular/Standard.
 * Errs conservative — better to quote slightly high than under-quote.
 */
export function mapHealthClass(request: PricingRequest): string {
  const hasBMI =
    request.heightFeet !== undefined &&
    request.heightInches !== undefined &&
    request.weight !== undefined

  const isTobacco = request.tobaccoStatus === "smoker"
  const conditions = request.medicalConditions ?? []
  const hasDUI = request.duiHistory === true

  const hasSeriousCondition = conditions.some((c) => SERIOUS_CONDITIONS.has(c))
  const hasMinorConditionOnly =
    conditions.length > 0 &&
    !hasSeriousCondition &&
    conditions.every((c) => MINOR_CONDITIONS.has(c))
  const hasModerateCondition =
    conditions.length > 0 && !hasSeriousCondition && !hasMinorConditionOnly

  // Tobacco, DUI, or serious conditions → always Standard
  if (isTobacco || hasDUI || hasSeriousCondition) return "R"

  if (!hasBMI) {
    // No height/weight — conservative defaults
    if (conditions.length > 0) return "R"
    return "P"
  }

  const bmi = calculateBMI(request.heightFeet!, request.heightInches!, request.weight!)

  if (bmi >= 35) return "R"
  if (bmi >= 30 || hasModerateCondition) return "R"
  if (bmi >= 25) {
    if (hasMinorConditionOnly) return "RP"
    if (conditions.length === 0) return "P"
    return "R"
  }

  // BMI < 25, no tobacco, no DUI, no serious conditions
  if (conditions.length === 0) return "PP"
  if (hasMinorConditionOnly) return "P"
  return "RP"
}

function parsePremium(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9.]/g, "")
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export class CompulifePricingProvider implements PricingProvider {
  name = "compulife"

  async getQuotes(request: PricingRequest): Promise<PricingResult[]> {
    const useProxy = Boolean(COMPULIFE_PROXY_URL)

    if (!useProxy && !COMPULIFE_AUTH_ID) {
      throw new Error("Compulife API not configured (COMPULIFE_AUTH_ID missing)")
    }

    if (!modeLogged) {
      modeLogged = true
      if (useProxy) {
        console.info("[Compulife] Using proxy mode")
      } else {
        console.info("[Compulife] Direct mode")
      }
    }

    const stateCode = resolveStateCode(request.state)
    if (!stateCode) {
      throw new Error(`Unknown state: ${request.state}`)
    }

    const category = request.categoryOverride ?? TERM_TO_CATEGORY[request.termLength] ?? null
    if (!category) {
      return []
    }

    const birthDate = ageToBirthDate(request.age)

    const response = useProxy
      ? await this.fetchViaProxy(request, birthDate, stateCode, category)
      : await this.fetchDirect(request, birthDate, stateCode, category)

    if (!response.ok) {
      throw new Error(`Compulife API error: ${response.status}`)
    }

    const data: unknown = await response.json()

    if (
      !data ||
      typeof data !== "object" ||
      !("Compulife_ComparisonResults" in data)
    ) {
      throw new Error("Invalid Compulife response structure")
    }

    const typed = data as CompulifeApiResponse

    // Can be a single object or array of category groupings
    const categories = Array.isArray(typed.Compulife_ComparisonResults)
      ? typed.Compulife_ComparisonResults
      : [typed.Compulife_ComparisonResults]

    const results: PricingResult[] = []
    const seen = new Set<string>()
    const unmapped: string[] = []

    for (const cat of categories) {
      if (!Array.isArray(cat.Compulife_Results)) continue

      for (const r of cat.Compulife_Results) {
        const carrierId = resolveCarrierId(r.Compulife_company)

        if (!carrierId) {
          unmapped.push(r.Compulife_company.trim())
          continue
        }

        const annualPremium = parsePremium(r.Compulife_premiumAnnual)
        const monthlyPremium = parsePremium(r.Compulife_premiumM)

        if (annualPremium <= 0) continue

        const productCode = r.Compulife_compprodcode?.trim() || ""
        const dedupeKey = `${carrierId}:${productCode}`

        // Skip exact duplicates (same carrier + same product code)
        if (seen.has(dedupeKey)) continue
        seen.add(dedupeKey)

        // Parse AM Best rating letter from full string (e.g., "A+" from "AMB # 06468 A+ u")
        const amBestRaw = r.Compulife_amb?.trim() || ""

        results.push({
          carrierId,
          carrierName: r.Compulife_company.trim(),
          productName: r.Compulife_product.trim(),
          annualPremium,
          monthlyPremium: monthlyPremium > 0 ? monthlyPremium : annualPremium / 12,
          riskClass: r.Compulife_healthcat?.trim() || r.Compulife_rgpfpp?.trim(),
          source: "compulife",
          productCode,
          isGuaranteed: r.Compulife_guar?.trim() === "gtd",
          amBestRating: amBestRaw || undefined,
        })
      }
    }

    if (unmapped.length > 0) {
      const unique = [...new Set(unmapped)]
      console.warn(`[Compulife] ${unique.length} unmapped carrier(s) skipped`)
    }

    return results
  }

  /** Direct mode — call compulifeapi.com with auth ID + public IP. */
  private async fetchDirect(
    request: PricingRequest,
    birthDate: { BirthYear: string; BirthMonth: string; BirthDay: string },
    stateCode: string,
    category: string,
  ): Promise<Response> {
    const publicIP = await getPublicIP()

    const compulifeRequest = {
      COMPULIFEAUTHORIZATIONID: COMPULIFE_AUTH_ID,
      BirthDay: birthDate.BirthDay,
      BirthMonth: birthDate.BirthMonth,
      BirthYear: birthDate.BirthYear,
      Sex: request.gender === "Male" ? "M" : "F",
      Smoker: request.tobaccoStatus === "smoker" ? "Y" : "N",
      Health: request.healthClassOverride ?? mapHealthClass(request),
      NewCategory: category,
      FaceAmount: String(request.coverageAmount),
      State: stateCode,
      ModeUsed: "M",
      SortOverride1: "A",
      REMOTE_IP: publicIP,
    }

    const json = JSON.stringify(compulifeRequest)
    const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${encodeURIComponent(json)}`

    return fetch(url, { signal: AbortSignal.timeout(10_000) })
  }

  /** Proxy mode — route through Railway proxy (injects auth ID server-side). */
  private async fetchViaProxy(
    request: PricingRequest,
    birthDate: { BirthYear: string; BirthMonth: string; BirthDay: string },
    stateCode: string,
    category: string,
  ): Promise<Response> {
    const compulifeRequest = {
      BirthDay: birthDate.BirthDay,
      BirthMonth: birthDate.BirthMonth,
      BirthYear: birthDate.BirthYear,
      Sex: request.gender === "Male" ? "M" : "F",
      Smoker: request.tobaccoStatus === "smoker" ? "Y" : "N",
      Health: request.healthClassOverride ?? mapHealthClass(request),
      NewCategory: category,
      FaceAmount: String(request.coverageAmount),
      State: stateCode,
      ModeUsed: "M",
      SortOverride1: "A",
    }

    const json = JSON.stringify(compulifeRequest)
    const url = `${COMPULIFE_PROXY_URL}/api/quote?COMPULIFE=${encodeURIComponent(json)}`

    return fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { "x-proxy-secret": COMPULIFE_PROXY_SECRET! },
    })
  }
}
