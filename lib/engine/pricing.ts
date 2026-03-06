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
  nicotineType?: string
  heightFeet?: number
  heightInches?: number
  weight?: number
  medicalConditions?: string[]
  duiHistory?: boolean
  healthClassOverride?: string // Force specific health class (PP/P/RP/R) — skips mapHealthClass()
  categoryOverride?: string // Force specific Compulife NewCategory code (e.g., "J" for 15yr ROP)
}

export interface PricingResult {
  carrierId: string
  carrierName: string
  productName: string
  monthlyPremium: number
  annualPremium: number
  riskClass?: string // From Compulife: "Preferred Plus", "Standard", etc.
  source: "mock" | "compulife"
  productCode?: string // Compulife internal product code (e.g., "BANNBONN")
  isGuaranteed?: boolean // true = guaranteed level premium for full term
  amBestRating?: string // AM Best rating from Compulife (e.g., "A+")
  productCategory?: "term" | "rop" | "term-to-age" | "rop-to-age" | "table-rated" | "ul" | "term-comparison"
}

export interface PricingProvider {
  name: string
  getQuotes(request: PricingRequest): Promise<PricingResult[]>
}
