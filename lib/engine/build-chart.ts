import { lookupBuildChart } from "@/lib/data/build-charts"
import type { Gender } from "@/lib/types"

export interface BuildChartResult {
  isWithinLimits: boolean
  rateClassImpact?: "preferred" | "standard" | "decline"
  bmi: number
  carrierNote?: string
}

export function calculateBMI(
  heightFeet: number,
  heightInches: number,
  weight: number,
): number {
  const totalInches = heightFeet * 12 + heightInches
  const bmi = (weight * 703) / (totalInches * totalInches)
  return Math.round(bmi * 10) / 10
}

export function checkBuildChart(
  carrierId: string,
  gender: Gender,
  heightFeet: number,
  heightInches: number,
  weight: number,
): BuildChartResult {
  const totalInches = heightFeet * 12 + heightInches
  const bmi = calculateBMI(heightFeet, heightInches, weight)

  const entries = lookupBuildChart(carrierId, gender)
  if (!entries) {
    return { isWithinLimits: true, bmi }
  }

  const entry = entries.find((e) => e.heightInches === totalInches)
  if (!entry) {
    // Height outside chart range — use nearest boundary
    const nearest =
      totalInches < entries[0]!.heightInches
        ? entries[0]!
        : entries[entries.length - 1]!

    if (weight <= nearest.maxWeightPreferred) {
      return { isWithinLimits: true, rateClassImpact: "preferred", bmi }
    }
    if (weight <= nearest.maxWeightStandard) {
      return {
        isWithinLimits: true,
        rateClassImpact: "standard",
        bmi,
        carrierNote: "Height at boundary of chart — verify with carrier",
      }
    }
    return {
      isWithinLimits: false,
      rateClassImpact: "decline",
      bmi,
      carrierNote: "Exceeds build chart limits",
    }
  }

  if (weight <= entry.maxWeightPreferred) {
    return { isWithinLimits: true, rateClassImpact: "preferred", bmi }
  }
  if (weight <= entry.maxWeightStandard) {
    return {
      isWithinLimits: true,
      rateClassImpact: "standard",
      bmi,
      carrierNote: "May qualify for Standard rate class only",
    }
  }
  return {
    isWithinLimits: false,
    rateClassImpact: "decline",
    bmi,
    carrierNote: "Exceeds build chart limits",
  }
}
