import type { Carrier, Product } from "./carrier"

export type Gender = "Male" | "Female"

export type TobaccoStatus = "non-smoker" | "smoker"

export type NicotineType = "none" | "cigarettes" | "vaping" | "cigars" | "smokeless" | "pouches" | "marijuana" | "nrt"

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
  nicotineType?: NicotineType
  healthIndicators?: HealthIndicators
  heightFeet?: number
  heightInches?: number
  weight?: number
  medicalConditions?: string[]
  medications?: string
  duiHistory?: boolean
  yearsSinceLastDui?: number | null
  includeROP?: boolean // Include Return of Premium quotes alongside standard term
  termToAge?: number // Level-to-age target (65, 70, 75, etc.) — queries Compulife T/U/V/A-E categories
  includeTableRatings?: boolean // Include table-rated quotes (T1-T4) for substandard risks
  includeUL?: boolean // Include No-Lapse Universal Life quotes (category 8)
  compareTerms?: boolean // Compare pricing across all term lengths (10/15/20/25/30)
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

export interface RateClassPrice {
  rateClass: string // "Preferred Plus", "Preferred", "Regular Plus", "Standard"
  rateClassCode: string // "PP", "P", "RP", "R"
  monthlyPremium: number
  annualPremium: number
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
  pricingSource?: "compulife" | "mock"
  productCode?: string // Compulife internal product code
  isGuaranteed?: boolean // true = guaranteed level premium for full term
  compulifeAmBest?: string // AM Best rating from Compulife (fresher than static data)
  riskClass?: string // Rate class from pricing provider (e.g., "Preferred Plus")
  rateClassSpread?: RateClassPrice[] // Pricing at different rate classes
  productCategory?: "term" | "rop" | "term-to-age" | "rop-to-age" | "table-rated" | "ul" | "term-comparison"
  tableRating?: string // Table rating code (T1-T4) when productCategory is "table-rated"
  termComparisonLength?: number // Term length label when productCategory is "term-comparison"
}

export interface QuoteResponse {
  quotes: CarrierQuote[]
  clientSummary: string
  totalCarriersChecked: number
  eligibleCount: number
  timestamp: string
}
