import type { Carrier } from "@/lib/types/carrier"
import type { Gender } from "@/lib/types/quote"
import { CARRIERS } from "@/lib/data/carriers"
import {
  checkMedicalEligibility,
  checkDUIEligibility,
  getStateAbbreviation,
} from "@/lib/engine/eligibility"
import { checkBuildChart } from "@/lib/engine/build-chart"
import { getMedicationWarnings, type MedicationWarning } from "@/lib/engine/medication-screening"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PreScreenResult {
  carrierId: string
  carrierName: string
  status: "eligible" | "likely_decline" | "flagged" | "unknown"
  reasons: string[]
  instantDecision: boolean
  medicationWarnings?: MedicationWarning[]
}

export interface LeadPreScreen {
  leadId: string
  screenedAt: string
  totalCarriers: number
  eligible: number
  likelyDecline: number
  flagged: number
  results: PreScreenResult[]
}

/* ------------------------------------------------------------------ */
/*  Pre-screen input                                                   */
/* ------------------------------------------------------------------ */

export interface PreScreenInput {
  leadId: string
  state?: string | null
  age?: number | null
  gender?: Gender | null
  coverageAmount?: number | null
  termLength?: number | null
  tobaccoStatus?: "smoker" | "non-smoker" | null
  medicalConditions?: string[]
  medications?: string | null
  duiHistory?: boolean
  yearsSinceLastDui?: number | null
  heightFeet?: number | null
  heightInches?: number | null
  weightLbs?: number | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_ORDER: Record<PreScreenResult["status"], number> = {
  eligible: 0,
  flagged: 1,
  likely_decline: 2,
  unknown: 3,
}

function hasSimplifiedIssue(carrier: Carrier): boolean {
  return carrier.products.some((p) => p.isSimplifiedIssue)
}

function hasESign(carrier: Carrier): boolean {
  return carrier.operational.eSign
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

function classifyTobacco(
  carrier: Carrier,
  tobaccoStatus: "smoker" | "non-smoker",
): { isFlagged: boolean; reason: string | null } {
  if (tobaccoStatus === "non-smoker") return { isFlagged: false, reason: null }

  // Smoker — check if vaping/smokeless gets non-smoker rates (a differentiator)
  const { keyNote } = carrier.tobacco
  if (keyNote) {
    return { isFlagged: true, reason: `Tobacco: ${keyNote}` }
  }
  return { isFlagged: true, reason: "Tobacco/smoker rates apply" }
}

/* ------------------------------------------------------------------ */
/*  Screen a single carrier                                            */
/* ------------------------------------------------------------------ */

function screenCarrier(
  carrier: Carrier,
  input: PreScreenInput,
): PreScreenResult {
  const reasons: string[] = []
  let hasDecline = false
  let hasFlagged = false
  const hasMinimalData =
    input.state != null || input.age != null

  // Not enough data → unknown
  if (!hasMinimalData) {
    return {
      carrierId: carrier.id,
      carrierName: carrier.name,
      status: "unknown",
      reasons: ["Insufficient lead data for screening"],
      instantDecision: hasESign(carrier) || hasSimplifiedIssue(carrier),
    }
  }

  // 1. State availability
  if (input.state) {
    const stateAbbr = getStateAbbreviation(input.state)
    if (carrier.statesNotAvailable.includes(stateAbbr)) {
      reasons.push(`Not available in ${stateAbbr}`)
      hasDecline = true
    }
  }

  // 2. Age range check against term products
  if (input.age != null) {
    const termProducts = carrier.products.filter((p) => p.type === "term")
    if (termProducts.length === 0) {
      reasons.push("No term products available")
      hasDecline = true
    } else {
      const anyAgeMatch = termProducts.some((p) => {
        const { min, max } = parseAgeRange(p.ageRange)
        return input.age! >= min && input.age! <= max
      })
      if (!anyAgeMatch) {
        const ranges = termProducts.map((p) => p.ageRange).join(", ")
        reasons.push(`Age ${input.age} outside range (${ranges})`)
        hasDecline = true
      }
    }
  }

  // 3. Face amount range
  if (input.coverageAmount != null) {
    const termProducts = carrier.products.filter((p) => p.type === "term")
    if (termProducts.length > 0) {
      const anyAmountMatch = termProducts.some((p) => {
        const { min, max } = parseFaceAmount(p.faceAmountRange)
        return input.coverageAmount! >= min && input.coverageAmount! <= max
      })
      if (!anyAmountMatch) {
        reasons.push(
          `Coverage $${input.coverageAmount.toLocaleString()} outside available range`,
        )
        hasDecline = true
      }
    }
  }

  // 4. Tobacco classification
  if (input.tobaccoStatus) {
    const tobaccoResult = classifyTobacco(carrier, input.tobaccoStatus)
    if (tobaccoResult.isFlagged && tobaccoResult.reason) {
      reasons.push(tobaccoResult.reason)
      hasFlagged = true
    }
  }

  // 5. Medical conditions
  if (input.medicalConditions && input.medicalConditions.length > 0) {
    const medResults = checkMedicalEligibility(
      carrier,
      input.medicalConditions,
    )
    for (const result of medResults) {
      if (result.status === "declined") {
        reasons.push(
          `Medical decline: ${result.conditionId}${result.carrierRule ? ` — ${result.carrierRule}` : ""}`,
        )
        hasDecline = true
      } else if (result.status === "review") {
        reasons.push(
          `Medical review: ${result.conditionId}${result.carrierRule ? ` — ${result.carrierRule}` : ""}`,
        )
        hasFlagged = true
      }
    }
  }

  // 6. DUI check
  if (input.duiHistory) {
    const duiResult = checkDUIEligibility(
      carrier,
      true,
      input.yearsSinceLastDui ?? null,
    )
    if (!duiResult.isAccepted) {
      reasons.push(
        `DUI: ${duiResult.carrierResult ?? duiResult.carrierRule ?? "Likely decline"}`,
      )
      hasDecline = true
    } else if (duiResult.carrierRule) {
      reasons.push(`DUI noted: ${duiResult.carrierResult ?? duiResult.carrierRule}`)
      hasFlagged = true
    }
  }

  // 7. Build chart (height/weight) — only if all dimensions provided
  if (
    input.heightFeet != null &&
    input.heightInches != null &&
    input.weightLbs != null &&
    input.gender
  ) {
    const buildResult = checkBuildChart(
      carrier.id,
      input.gender,
      input.heightFeet,
      input.heightInches,
      input.weightLbs,
    )
    if (!buildResult.isWithinLimits) {
      reasons.push(
        `Exceeds build chart limits (BMI ${buildResult.bmi})`,
      )
      hasDecline = true
    } else if (buildResult.rateClassImpact === "standard") {
      reasons.push(
        `Standard rate class only (BMI ${buildResult.bmi})`,
      )
      hasFlagged = true
    }
  }

  // 8. Medication screening
  let medWarnings: MedicationWarning[] | undefined
  if (input.medications) {
    const warnings = getMedicationWarnings(input.medications, carrier.id)
    if (warnings.length > 0) {
      medWarnings = warnings
      for (const w of warnings) {
        if (w.action === "decline") {
          reasons.push(
            `Rx decline: ${w.medication} (${w.condition})${w.detail ? ` — ${w.detail}` : ""}`,
          )
          hasDecline = true
        } else if (w.action === "conditional") {
          reasons.push(
            `Rx conditional: ${w.medication} (${w.condition})${w.detail ? ` — ${w.detail}` : ""}`,
          )
          hasFlagged = true
        }
      }
    }
  }

  // Determine final status
  let status: PreScreenResult["status"] = "eligible"
  if (hasDecline) {
    status = "likely_decline"
  } else if (hasFlagged) {
    status = "flagged"
  }

  return {
    carrierId: carrier.id,
    carrierName: carrier.name,
    status,
    reasons: reasons.length > 0 ? reasons : ["No issues found"],
    instantDecision: hasESign(carrier) || hasSimplifiedIssue(carrier),
    medicationWarnings: medWarnings,
  }
}

/* ------------------------------------------------------------------ */
/*  Run pre-screen across all carriers                                 */
/* ------------------------------------------------------------------ */

export function runPreScreen(input: PreScreenInput): LeadPreScreen {
  const results = CARRIERS.map((carrier) => screenCarrier(carrier, input))

  // Sort: eligible → flagged → likely_decline → unknown
  const sorted = [...results].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  )

  const eligible = sorted.filter((r) => r.status === "eligible").length
  const likelyDecline = sorted.filter(
    (r) => r.status === "likely_decline",
  ).length
  const flagged = sorted.filter((r) => r.status === "flagged").length

  return {
    leadId: input.leadId,
    screenedAt: new Date().toISOString(),
    totalCarriers: sorted.length,
    eligible,
    likelyDecline,
    flagged,
    results: sorted,
  }
}
