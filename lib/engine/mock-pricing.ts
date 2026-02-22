// Wrapped by mock-provider.ts — direct usage deprecated
import type { Gender, TobaccoStatus, TermLength } from "@/lib/types"

const BASE_RATES: Record<string, number> = {
  lga: 0.11,
  sbli: 0.115,
  moo: 0.12,
  nlg: 0.125,
  foresters: 0.13,
  fg: 0.13,
  amam: 0.14,
  americo: 0.145,
  jh: 0.15,
  uhl: 0.155,
  transamerica: 0.16,
}

const TERM_FACTORS: Record<TermLength, number> = {
  10: 0.7,
  15: 0.85,
  20: 1.0,
  25: 1.15,
  30: 1.3,
  35: 1.45,
  40: 1.6,
}

const GENDER_FACTORS: Record<Gender, number> = {
  Male: 1.0,
  Female: 0.88,
}

const TOBACCO_FACTORS: Record<TobaccoStatus, number> = {
  "non-smoker": 1.0,
  smoker: 2.4,
}

const ANNUAL_DISCOUNT_MULTIPLIER = 11.5

function computeAgeFactor(age: number): number {
  return 1 + (age - 25) * 0.035
}

export interface PricingInput {
  carrierId: string
  age: number
  gender: Gender
  coverageAmount: number
  termLength: TermLength
  tobaccoStatus: TobaccoStatus
}

export interface PricingResult {
  monthlyPremium: number
  annualPremium: number
}

export function calculatePremium(input: PricingInput): PricingResult {
  const baseRate = BASE_RATES[input.carrierId] ?? 0.13

  const ageFactor = computeAgeFactor(input.age)
  const genderFactor = GENDER_FACTORS[input.gender]
  const termFactor = TERM_FACTORS[input.termLength]
  const tobaccoFactor = TOBACCO_FACTORS[input.tobaccoStatus]

  const monthlyPremium =
    (input.coverageAmount / 1000) *
    baseRate *
    ageFactor *
    genderFactor *
    termFactor *
    tobaccoFactor

  const annualPremium = monthlyPremium * ANNUAL_DISCOUNT_MULTIPLIER

  return {
    monthlyPremium: Math.round(monthlyPremium * 100) / 100,
    annualPremium: Math.round(annualPremium * 100) / 100,
  }
}
