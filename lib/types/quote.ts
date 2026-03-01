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

export interface MedicationFlag {
  medication: string
  condition: string
  action: "decline" | "conditional"
  detail?: string
}

export interface UnderwritingWarning {
  type: "rx_decline" | "rx_review" | "rx_graded" | "combo_decline"
  label: string
  detail?: string
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
  medicationFlags?: MedicationFlag[]
  underwritingWarnings?: UnderwritingWarning[]
}

export interface QuoteResponse {
  quotes: CarrierQuote[]
  clientSummary: string
  totalCarriersChecked: number
  eligibleCount: number
  timestamp: string
}
