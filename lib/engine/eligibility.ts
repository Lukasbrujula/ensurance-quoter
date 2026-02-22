import type { Carrier, Product } from "@/lib/types"

const STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
}

export function getStateAbbreviation(state: string): string {
  if (state.length === 2) return state.toUpperCase()
  return STATE_ABBREVIATIONS[state] ?? state.toUpperCase()
}

export interface EligibilityResult {
  isEligible: boolean
  ineligibilityReason?: string
  matchedProduct: Product | null
}

export interface MedicalEligibilityResult {
  conditionId: string
  status: "accepted" | "review" | "declined" | "unknown"
  carrierRule: string | null
}

export interface DUIEligibilityResult {
  isAccepted: boolean
  carrierRule: string | null
  carrierResult: string | null
}

export interface BuildCheckResult {
  isWithinLimits: boolean
  rateClassImpact?: "preferred" | "standard" | "decline"
}

export interface EligibilityOptions {
  duiHistory?: boolean
  yearsSinceLastDui?: number | null
  medicalConditions?: string[]
  buildCheck?: BuildCheckResult
}

export function checkMedicalEligibility(
  carrier: Carrier,
  conditionIds: string[],
): MedicalEligibilityResult[] {
  return conditionIds.map((conditionId) => {
    const rule = carrier.medicalHighlights[conditionId]
    if (!rule) {
      return { conditionId, status: "unknown" as const, carrierRule: null }
    }
    const lowerRule = rule.toLowerCase()
    if (lowerRule.includes("decline")) {
      return { conditionId, status: "declined" as const, carrierRule: rule }
    }
    if (lowerRule.includes("review") || lowerRule.includes("individual")) {
      return { conditionId, status: "review" as const, carrierRule: rule }
    }
    return { conditionId, status: "accepted" as const, carrierRule: rule }
  })
}

export function checkDUIEligibility(
  carrier: Carrier,
  duiHistory: boolean,
  yearsSinceLastDui: number | null,
): DUIEligibilityResult {
  if (!duiHistory) {
    return { isAccepted: true, carrierRule: null, carrierResult: null }
  }
  if (!carrier.dui) {
    return {
      isAccepted: true,
      carrierRule: "No specific DUI policy",
      carrierResult: "ACCEPT (no policy)",
    }
  }
  const years = yearsSinceLastDui ?? 0
  const resultLower = carrier.dui.result.toLowerCase()
  if (resultLower.includes("accept") || resultLower.includes("flat extra")) {
    return {
      isAccepted: true,
      carrierRule: carrier.dui.rule,
      carrierResult: carrier.dui.result,
    }
  }
  if (years >= 5) {
    return {
      isAccepted: true,
      carrierRule: carrier.dui.rule,
      carrierResult: "Likely accepted (5+ years)",
    }
  }
  return {
    isAccepted: false,
    carrierRule: carrier.dui.rule,
    carrierResult: carrier.dui.result,
  }
}

function parseAgeRange(range: string): { min: number; max: number } {
  const parts = range.split("-").map(Number)
  return { min: parts[0] ?? 0, max: parts[1] ?? 999 }
}

function parseFaceAmount(range: string): { min: number; max: number } {
  const normalized = range.replace(/\$/g, "").replace(/\s/g, "")
  const parts = normalized.split("-")

  const parseAmount = (val: string): number => {
    const cleaned = val.replace(/\+$/, "")
    if (cleaned.endsWith("M")) return parseFloat(cleaned) * 1_000_000
    if (cleaned.endsWith("K")) return parseFloat(cleaned) * 1_000
    return parseFloat(cleaned)
  }

  const min = parseAmount(parts[0] ?? "0")
  const max = parts[1] ? parseAmount(parts[1]) : Infinity

  return { min, max }
}

function isStateAvailable(carrier: Carrier, stateAbbr: string): boolean {
  return !carrier.statesNotAvailable.includes(stateAbbr)
}

function isAgeInRange(product: Product, age: number): boolean {
  const { min, max } = parseAgeRange(product.ageRange)
  return age >= min && age <= max
}

function isFaceAmountInRange(product: Product, amount: number): boolean {
  const { min, max } = parseFaceAmount(product.faceAmountRange)
  return amount >= min && amount <= max
}

function isTermProduct(product: Product): boolean {
  return product.type === "term"
}

export function checkEligibility(
  carrier: Carrier,
  age: number,
  state: string,
  coverageAmount: number,
  termLength: number,
  options?: EligibilityOptions,
): EligibilityResult {
  const stateAbbr = getStateAbbreviation(state)

  if (!isStateAvailable(carrier, stateAbbr)) {
    return {
      isEligible: false,
      ineligibilityReason: `Not available in ${stateAbbr}`,
      matchedProduct: null,
    }
  }

  const termProducts = carrier.products.filter(isTermProduct)

  if (termProducts.length === 0) {
    return {
      isEligible: false,
      ineligibilityReason: `No term products available`,
      matchedProduct: null,
    }
  }

  for (const product of termProducts) {
    if (!isAgeInRange(product, age)) continue
    if (!isFaceAmountInRange(product, coverageAmount)) continue

    if (options?.duiHistory) {
      const duiResult = checkDUIEligibility(
        carrier,
        true,
        options.yearsSinceLastDui ?? null,
      )
      if (!duiResult.isAccepted) {
        return {
          isEligible: false,
          ineligibilityReason: `DUI: ${duiResult.carrierResult}`,
          matchedProduct: null,
        }
      }
    }

    if (options?.buildCheck && !options.buildCheck.isWithinLimits) {
      return {
        isEligible: false,
        ineligibilityReason: "Exceeds height/weight limits",
        matchedProduct: null,
      }
    }

    return {
      isEligible: true,
      matchedProduct: product,
    }
  }

  const firstTerm = termProducts[0]
  if (!firstTerm) {
    return {
      isEligible: false,
      ineligibilityReason: "No matching term product",
      matchedProduct: null,
    }
  }

  if (!isAgeInRange(firstTerm, age)) {
    return {
      isEligible: false,
      ineligibilityReason: `Age ${age} outside range ${firstTerm.ageRange}`,
      matchedProduct: null,
    }
  }

  return {
    isEligible: false,
    ineligibilityReason: `Coverage $${coverageAmount.toLocaleString()} outside available range`,
    matchedProduct: null,
  }
}
