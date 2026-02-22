import type { Carrier, Product } from "./carrier"

export type Gender = "Male" | "Female"

export type TobaccoStatus = "non-smoker" | "smoker"

export type TermLength = 10 | 15 | 20 | 25 | 30 | 35 | 40

export interface HealthIndicators {
  bloodPressure?: string
  ldl?: number
  bmi?: number
  preExistingConditions?: string[]
}

export interface QuoteRequest {
  name: string
  age: number
  gender: Gender
  state: string
  coverageAmount: number
  termLength: TermLength
  tobaccoStatus: TobaccoStatus
  healthIndicators?: HealthIndicators
  heightFeet?: number
  heightInches?: number
  weight?: number
  medicalConditions?: string[]
  medications?: string
  duiHistory?: boolean
  yearsSinceLastDui?: number | null
}

export interface CarrierQuote {
  carrier: Carrier
  product: Product
  monthlyPremium: number
  annualPremium: number
  matchScore: number
  isEligible: boolean
  ineligibilityReason?: string
  isBestValue: boolean
  features: string[]
}

export interface QuoteResponse {
  quotes: CarrierQuote[]
  clientSummary: string
  totalCarriersChecked: number
  eligibleCount: number
  timestamp: string
}
