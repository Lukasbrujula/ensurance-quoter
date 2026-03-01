/**
 * Tobacco classification engine.
 *
 * Maps a nicotine type to each carrier's tobacco rules to determine
 * whether the carrier classifies the user as smoker or non-smoker.
 */

import type { Carrier, TobaccoRules } from "@/lib/types/carrier"
import type { NicotineType } from "@/lib/types/quote"

type TobaccoClassification = "smoker" | "non-smoker"

/**
 * Look up the carrier's rule string for a given nicotine type.
 * "pouches" maps to the NRT field since ZYN/pouches are nicotine replacement.
 */
function getRuleText(tobacco: TobaccoRules, nicotineType: NicotineType): string {
  switch (nicotineType) {
    case "cigarettes":
      return tobacco.cigarettes
    case "vaping":
      return tobacco.vaping
    case "cigars":
      return tobacco.cigars
    case "smokeless":
      return tobacco.smokeless
    case "pouches":
      return tobacco.nrt
    case "marijuana":
      return tobacco.marijuana
    case "nrt":
      return tobacco.nrt
    case "none":
      return "Non-smoker"
  }
}

/**
 * Returns true if the rule text indicates the carrier gives non-smoker
 * (non-tobacco) rates for this nicotine type.
 *
 * Matches patterns like:
 * - "NON-SMOKER rates"
 * - "NON-TOBACCO possible"
 * - "Non-tobacco rates"
 * - "Preferred Best NT possible"
 */
function isNonSmokerRule(ruleText: string): boolean {
  const normalized = ruleText.toUpperCase()
  if (normalized.includes("NON-SMOKER")) return true
  if (normalized.includes("NON-TOBACCO")) return true
  if (normalized.includes("PREFERRED") && normalized.includes("NT")) return true
  return false
}

/**
 * Classify how a carrier treats the given nicotine type.
 *
 * - "cigarettes" always returns "smoker" (no carrier gives non-smoker rates)
 * - "none" always returns "non-smoker"
 * - Others check the carrier's tobacco rules string for that type
 */
export function classifyTobaccoForCarrier(
  nicotineType: NicotineType,
  carrier: Carrier,
): TobaccoClassification {
  if (nicotineType === "none") return "non-smoker"
  if (nicotineType === "cigarettes") return "smoker"

  const ruleText = getRuleText(carrier.tobacco, nicotineType)
  return isNonSmokerRule(ruleText) ? "non-smoker" : "smoker"
}

/**
 * Returns true if the carrier gives non-smoker rates for this nicotine type.
 * Used by match scoring to award bonus points.
 */
export function hasNicotineAdvantage(
  nicotineType: NicotineType,
  carrier: Carrier,
): boolean {
  if (nicotineType === "none" || nicotineType === "cigarettes") return false
  return classifyTobaccoForCarrier(nicotineType, carrier) === "non-smoker"
}
