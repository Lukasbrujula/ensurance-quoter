import type { PricingProvider, PricingRequest, PricingResult } from "./pricing"

/**
 * Compulife cloud API pricing provider.
 *
 * Calls compulifeapi.com directly with a JSON query string.
 * Auth ID is IP-locked on first use — works for local dev (stable IP).
 * For Vercel production (dynamic IPs), the fallback provider in
 * pricing-config.ts falls back to MockPricingProvider seamlessly.
 */

const COMPULIFE_AUTH_ID = process.env.COMPULIFE_AUTH_ID

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

function parsePremium(value: string | undefined): number {
  if (!value) return 0
  const cleaned = value.replace(/[^0-9.]/g, "")
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export class CompulifePricingProvider implements PricingProvider {
  name = "compulife"

  async getQuotes(request: PricingRequest): Promise<PricingResult[]> {
    if (!COMPULIFE_AUTH_ID) {
      throw new Error("Compulife API not configured (COMPULIFE_AUTH_ID missing)")
    }

    const stateCode = resolveStateCode(request.state)
    if (!stateCode) {
      throw new Error(`Unknown state: ${request.state}`)
    }

    const category = TERM_TO_CATEGORY[request.termLength] ?? null
    if (!category) {
      return []
    }

    const birthDate = ageToBirthDate(request.age)
    const publicIP = await getPublicIP()

    const compulifeRequest = {
      COMPULIFEAUTHORIZATIONID: COMPULIFE_AUTH_ID,
      BirthDay: birthDate.BirthDay,
      BirthMonth: birthDate.BirthMonth,
      BirthYear: birthDate.BirthYear,
      Sex: request.gender === "Male" ? "M" : "F",
      Smoker: request.tobaccoStatus === "smoker" ? "Y" : "N",
      Health: "PP",
      NewCategory: category,
      FaceAmount: String(request.coverageAmount),
      State: stateCode,
      ModeUsed: "M",
      SortOverride1: "A",
      REMOTE_IP: publicIP,
    }

    const json = JSON.stringify(compulifeRequest)
    const url = `https://www.compulifeapi.com/api/request/?COMPULIFE=${json}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    })

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

    const resultMap = new Map<string, PricingResult>()
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

        const existing = resultMap.get(carrierId)
        if (!existing || existing.annualPremium > annualPremium) {
          resultMap.set(carrierId, {
            carrierId,
            carrierName: r.Compulife_company.trim(),
            productName: r.Compulife_product.trim(),
            annualPremium,
            monthlyPremium: monthlyPremium > 0 ? monthlyPremium : annualPremium / 12,
            riskClass: r.Compulife_healthcat?.trim() || r.Compulife_rgpfpp?.trim(),
            source: "compulife",
          })
        }
      }
    }

    if (unmapped.length > 0) {
      const unique = [...new Set(unmapped)]
      console.warn(
        `Unmapped Compulife carriers (${unique.length}): ${unique.slice(0, 15).join(", ")}`,
      )
    }

    return Array.from(resultMap.values())
  }
}
