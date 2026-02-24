import type { PricingProvider, PricingRequest, PricingResult } from "./pricing"

/**
 * Compulife pricing provider.
 *
 * Calls the Compulife API wrapper (Node.js Express on a separate server)
 * which in turn POSTs to the CQS CGI binary and returns structured JSON.
 *
 * Falls back cleanly — if env vars aren't set, pricing-config.ts uses MockPricingProvider.
 */

const COMPULIFE_API_URL = process.env.COMPULIFE_API_URL
const COMPULIFE_API_KEY = process.env.COMPULIFE_API_KEY

/**
 * Maps Compulife company names (as returned by CQS) to our internal carrier IDs.
 *
 * Populate this mapping once you run real Compulife queries and see the exact
 * company names CQS returns. The keys are lowercased for case-insensitive matching.
 *
 * Run a test quote and check server logs for "Unmapped Compulife carrier" to find
 * company names that need mapping.
 */
const COMPULIFE_NAME_TO_CARRIER_ID: Record<string, string> = {
  "american amicable": "amam",
  "foresters financial": "foresters",
  "foresters life": "foresters",
  "mutual of omaha": "moo",
  "john hancock": "jh",
  "john hancock life": "jh",
  "banner life": "lga",
  "legal & general": "lga",
  "sbli": "sbli",
  "sbli usa": "sbli",
  "national life group": "nlg",
  "life savings": "nlg",
  "lsw": "nlg",
  "transamerica": "transamerica",
  "transamerica life": "transamerica",
  "americo": "americo",
  "americo financial": "americo",
  "united home life": "uhl",
  "fidelity & guaranty": "fg",
  "f&g": "fg",
  "protective": "protective",
  "protective life": "protective",
  "corebridge": "corebridge",
  "corebridge financial": "corebridge",
  "lincoln": "lincoln",
  "lincoln financial": "lincoln",
  "lincoln national": "lincoln",
  "prudential": "prudential",
  "prudential financial": "prudential",
  "nationwide": "nationwide",
  "nationwide life": "nationwide",
  "pacific life": "pacific",
  "principal": "principal",
  "principal financial": "principal",
  "north american": "northamerican",
  "north american life": "northamerican",
  "securian": "securian",
  "securian financial": "securian",
  "global atlantic": "globalatlantic",
  "mass mutual": "massmutual",
  "massmutual": "massmutual",
  "massachusetts mutual": "massmutual",
  "new york life": "newyorklife",
  "penn mutual": "pennmutual",
  "penn mutual life": "pennmutual",
  "symetra": "symetra",
  "symetra life": "symetra",
  "brighthouse": "brighthouse",
  "brighthouse financial": "brighthouse",
  "gerber life": "gerber",
  "gerber": "gerber",
  "colonial penn": "colonialpenn",
  "globe life": "globelife",
  "anico": "anico",
  "american national": "anico",
  "kemper": "kemper",
  "kemper life": "kemper",
}

function resolveCarrierId(compulifeCompanyName: string): string | null {
  const normalized = compulifeCompanyName.trim().toLowerCase()

  // Exact match first
  if (COMPULIFE_NAME_TO_CARRIER_ID[normalized]) {
    return COMPULIFE_NAME_TO_CARRIER_ID[normalized]
  }

  // Partial match — check if any mapping key is contained in the company name
  for (const [key, carrierId] of Object.entries(COMPULIFE_NAME_TO_CARRIER_ID)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return carrierId
    }
  }

  return null
}

/** Shape of each result from the Compulife API wrapper (Task 6) */
interface CompulifeApiResult {
  companyCode: string
  productCode: string
  companyName: string
  productName: string
  healthCategory: string
  annualPremium: number
  monthlyPremium: number
  policyFee: number
  guaranteed: string
  rateClass: string
}

interface CompulifeApiResponse {
  success: boolean
  results: CompulifeApiResult[]
  meta?: {
    state: string
    faceAmount: number
    category: string
    resultsCount: number
  }
  error?: string
}

export class CompulifePricingProvider implements PricingProvider {
  name = "compulife"

  async getQuotes(request: PricingRequest): Promise<PricingResult[]> {
    if (!COMPULIFE_API_URL || !COMPULIFE_API_KEY) {
      throw new Error("Compulife API not configured")
    }

    const response = await fetch(`${COMPULIFE_API_URL}/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": COMPULIFE_API_KEY,
      },
      body: JSON.stringify({
        age: request.age,
        gender: request.gender === "Male" ? "M" : "F",
        state: request.state,
        coverage: request.coverageAmount,
        term: request.termLength,
        smoker: request.tobaccoStatus === "smoker",
        healthClass: "preferred_plus",
        mode: "annual",
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      throw new Error(
        `Compulife API error: ${response.status} - ${errorText.substring(0, 200)}`,
      )
    }

    const data: CompulifeApiResponse = await response.json()

    if (!data.success || !Array.isArray(data.results)) {
      throw new Error(data.error ?? "Invalid response from Compulife API")
    }

    const results: PricingResult[] = []
    const unmapped: string[] = []

    for (const r of data.results) {
      const carrierId = resolveCarrierId(r.companyName)

      if (!carrierId) {
        unmapped.push(r.companyName)
        continue
      }

      // Deduplicate — keep cheapest result per carrier
      const existing = results.find((existing) => existing.carrierId === carrierId)
      if (existing && existing.annualPremium <= r.annualPremium) {
        continue
      }

      const result: PricingResult = {
        carrierId,
        carrierName: r.companyName,
        productName: r.productName,
        annualPremium: r.annualPremium,
        monthlyPremium: r.monthlyPremium > 0 ? r.monthlyPremium : r.annualPremium / 12,
        riskClass: r.healthCategory || r.rateClass,
        source: "compulife",
      }

      if (existing) {
        const idx = results.indexOf(existing)
        results[idx] = result
      } else {
        results.push(result)
      }
    }

    if (unmapped.length > 0) {
      const unique = [...new Set(unmapped)]
      console.warn(
        `Unmapped Compulife carriers (${unique.length}): ${unique.slice(0, 10).join(", ")}`,
      )
    }

    return results
  }
}
