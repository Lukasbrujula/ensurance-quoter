import type {
  Carrier,
  MedicalConditionRule,
  MedicalDecision,
  PrescriptionAction,
  Product,
} from "@/lib/types"
import { MEDICAL_CONDITIONS } from "@/lib/data/medical-conditions"

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

// ---------------------------------------------------------------------------
// Structured medical eligibility (uses MedicalConditionRule[] when available)
// ---------------------------------------------------------------------------

export interface StructuredMedicalResult {
  conditionId: string
  conditionLabel: string
  decision: MedicalDecision | null
  lookbackMonths: number | null
  rateClass: string | null
  conditions: string | null
  notes: string | null
  source: "structured" | "legacy"
}

function normalizeConditionName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function findStructuredMatch(
  rules: MedicalConditionRule[],
  label: string,
): MedicalConditionRule | undefined {
  const normalizedLabel = normalizeConditionName(label)
  return rules.find((mc) => {
    const normalizedCondition = normalizeConditionName(mc.condition)
    return (
      normalizedCondition === normalizedLabel ||
      normalizedCondition.includes(normalizedLabel) ||
      normalizedLabel.includes(normalizedCondition)
    )
  })
}

function inferDecisionFromLegacy(rule: string): MedicalDecision {
  const lower = rule.toLowerCase()
  if (lower.includes("decline")) return "DECLINE"
  if (lower.includes("review") || lower.includes("individual")) return "REVIEW"
  if (lower.includes("conditional") || lower.includes("modified")) return "CONDITIONAL"
  return "ACCEPT"
}

/**
 * Enhanced medical eligibility check — uses structured MedicalConditionRule[]
 * when available, falls back to legacy medicalHighlights string matching.
 */
export function checkStructuredMedicalEligibility(
  carrier: Carrier,
  conditionIds: string[],
): StructuredMedicalResult[] {
  return conditionIds.map((conditionId) => {
    const conditionLabel =
      MEDICAL_CONDITIONS.find((c) => c.id === conditionId)?.label ?? conditionId

    // Try structured data first
    if (carrier.medicalConditions && carrier.medicalConditions.length > 0) {
      const match = findStructuredMatch(carrier.medicalConditions, conditionLabel)
      if (match) {
        return {
          conditionId,
          conditionLabel,
          decision: match.decision,
          lookbackMonths: match.lookbackMonths,
          rateClass: match.rateClass,
          conditions: match.conditions,
          notes: match.notes,
          source: "structured" as const,
        }
      }
    }

    // Fall back to legacy medicalHighlights
    const legacyRule = carrier.medicalHighlights[conditionId]
    if (legacyRule) {
      return {
        conditionId,
        conditionLabel,
        decision: inferDecisionFromLegacy(legacyRule),
        lookbackMonths: null,
        rateClass: null,
        conditions: null,
        notes: legacyRule,
        source: "legacy" as const,
      }
    }

    return {
      conditionId,
      conditionLabel,
      decision: null,
      lookbackMonths: null,
      rateClass: null,
      conditions: null,
      notes: null,
      source: "legacy" as const,
    }
  })
}

// ---------------------------------------------------------------------------
// Prescription screening (uses PrescriptionExclusions when available)
// ---------------------------------------------------------------------------

export interface PrescriptionScreenResult {
  medication: string
  action: PrescriptionAction
  associatedCondition: string | null
  notes: string | null
}

/**
 * Screens user-entered medications against carrier prescription exclusions.
 * Returns matches where the carrier flags the medication as DECLINE or REVIEW.
 */
export function checkPrescriptionScreening(
  carrier: Carrier,
  medicationsInput: string,
): PrescriptionScreenResult[] {
  if (!carrier.prescriptionExclusions?.medications?.length) return []
  if (!medicationsInput.trim()) return []

  const userMeds = medicationsInput
    .split(/[,;]+/)
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean)

  const results: PrescriptionScreenResult[] = []

  for (const exclusion of carrier.prescriptionExclusions.medications) {
    if (exclusion.action === "ACCEPT") continue

    const exclusionNameLower = exclusion.name.toLowerCase()
    const matched = userMeds.some(
      (med) => exclusionNameLower.includes(med) || med.includes(exclusionNameLower),
    )

    if (matched) {
      results.push({
        medication: exclusion.name,
        action: exclusion.action,
        associatedCondition: exclusion.associatedCondition,
        notes: exclusion.notes,
      })
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Combination decline checks
// ---------------------------------------------------------------------------

export interface CombinationDeclineResult {
  conditions: string[]
  decision: string
  notes: string | null
  matchedConditions: string[]
}

/**
 * Checks if the client's selected conditions trigger any multi-condition
 * decline rules defined in carrier.combinationDeclines.
 */
export function checkCombinationDeclines(
  carrier: Carrier,
  conditionIds: string[],
): CombinationDeclineResult[] {
  if (!carrier.combinationDeclines?.length) return []
  if (conditionIds.length < 2) return []

  const conditionLabels = conditionIds.map((id) => {
    const mc = MEDICAL_CONDITIONS.find((c) => c.id === id)
    return normalizeConditionName(mc?.label ?? id)
  })

  return carrier.combinationDeclines
    .filter((combo) => {
      const matchCount = combo.conditions.filter((cc) =>
        conditionLabels.some((cl) => {
          const normalizedCc = normalizeConditionName(cc)
          return cl.includes(normalizedCc) || normalizedCc.includes(cl)
        }),
      ).length
      return matchCount >= 2
    })
    .map((combo) => ({
      conditions: combo.conditions,
      decision: combo.decision,
      notes: combo.notes,
      matchedConditions: combo.conditions.filter((cc) =>
        conditionLabels.some((cl) => {
          const normalizedCc = normalizeConditionName(cc)
          return cl.includes(normalizedCc) || normalizedCc.includes(cl)
        }),
      ),
    }))
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
