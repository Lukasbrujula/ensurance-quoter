/**
 * Pricing provider abstraction layer.
 *
 * The quote API route calls this interface — not mock-pricing.ts directly.
 * To swap pricing backends, implement PricingProvider and update pricing-config.ts.
 */

export interface PricingRequest {
  age: number
  gender: "Male" | "Female"
  state: string
  coverageAmount: number
  termLength: number
  tobaccoStatus: "non-smoker" | "smoker"
  heightFeet?: number
  heightInches?: number
  weight?: number
  medicalConditions?: string[]
  duiHistory?: boolean
}

export interface PricingResult {
  carrierId: string
  carrierName: string
  productName: string
  monthlyPremium: number
  annualPremium: number
  riskClass?: string // From Compulife: "Preferred Plus", "Standard", etc.
  source: "mock" | "compulife"
}

export interface PricingProvider {
  name: string
  getQuotes(request: PricingRequest): Promise<PricingResult[]>
}
