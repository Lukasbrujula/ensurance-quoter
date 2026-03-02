import type { Carrier, AmBestRating, NicotineType, TobaccoStatus } from "@/lib/types"
import { checkMedicalEligibility } from "./eligibility"
import { hasNicotineAdvantage } from "./tobacco-classification"

const AM_BEST_SCORES: Record<AmBestRating, number> = {
  "A++": 15,
  "A+": 15,
  A: 12,
  "A-": 10,
  "B++": 7,
  "B+": 5,
  NR: 0,
}

interface ScoringInput {
  carrier: Carrier
  tobaccoStatus: TobaccoStatus
  nicotineType?: NicotineType
  isStateEligible: boolean
  priceRank: number
  medicalConditions?: string[]
  buildRateClass?: "preferred" | "standard" | "decline"
  rxDeclineCount?: number
  rxReviewCount?: number
  comboDeclineCount?: number
}

export function calculateMatchScore(input: ScoringInput): number {
  let score = 70

  score += AM_BEST_SCORES[input.carrier.amBest]

  if (input.carrier.operational.eSign) {
    score += 4
  }

  const hasROP = input.carrier.products.some((p) => p.hasROP)
  if (hasROP) {
    score += 2
  }

  if (input.tobaccoStatus === "non-smoker") {
    const lookback = input.carrier.tobacco.quitLookback.toLowerCase()
    if (lookback.includes("12") || lookback.includes("6")) {
      score += 3
    }
  }

  if (input.nicotineType && hasNicotineAdvantage(input.nicotineType, input.carrier)) {
    score += 12
  }

  if (!input.isStateEligible) {
    score -= 50
  }

  if (input.priceRank === 0) {
    score += 5
  } else if (input.priceRank === 1) {
    score += 3
  }

  if (input.buildRateClass === "preferred") {
    score += 2
  }

  const lb = input.carrier.livingBenefits
  if (lb && lb !== "None specified") {
    score += 2
  }

  if (input.medicalConditions && input.medicalConditions.length > 0) {
    const results = checkMedicalEligibility(
      input.carrier,
      input.medicalConditions,
    )
    const declinedCount = results.filter(
      (r) => r.status === "declined",
    ).length
    const acceptedCount = results.filter(
      (r) => r.status === "accepted",
    ).length
    score -= declinedCount * 8
    score += acceptedCount * 2
  }

  // Prescription exclusion penalties
  if (input.rxDeclineCount) {
    score -= input.rxDeclineCount * 10
  }
  if (input.rxReviewCount) {
    score -= input.rxReviewCount * 3
  }

  // Combination decline penalties
  if (input.comboDeclineCount) {
    score -= input.comboDeclineCount * 5
  }

  return Math.max(0, Math.min(99, score))
}

export function rankByPrice(
  carrierPrices: Array<{ carrierId: string; monthlyPremium: number }>,
): Map<string, number> {
  const sorted = [...carrierPrices].sort(
    (a, b) => a.monthlyPremium - b.monthlyPremium,
  )

  const rankMap = new Map<string, number>()
  sorted.forEach((item, index) => {
    rankMap.set(item.carrierId, index)
  })

  return rankMap
}
