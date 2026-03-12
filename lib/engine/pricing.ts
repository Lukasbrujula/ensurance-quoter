/**
 * Pricing provider abstraction layer.
 *
 * The quote API route calls this interface via pricing-config.ts.
 * Currently backed by CompulifePricingProvider (real carrier pricing).
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
  stateCodeOverride?: string // Force specific Compulife state code (e.g., "52" for NY Non-Business)
  underwritingType?: "all" | "fuw" | "si" // Filter by underwriting type: "fuw" = fully underwritten only, "si" = simplified issue only
  companyInclude?: string // Comma-separated CompCodes for COMPINC filter (e.g., "BANN,TRAN")
  // Health Analyzer — Phase 5 advanced fields (wired through from intake)
  systolic?: number
  diastolic?: number
  bpMedication?: boolean
  cholesterolLevel?: number
  hdlRatio?: number
  cholesterolMedication?: boolean
  familyHeartDisease?: boolean
  familyCancer?: boolean
  alcoholHistory?: boolean
  alcoholYearsSince?: number
  drugHistory?: boolean
  drugYearsSince?: number
}

export interface PricingResult {
  carrierId: string
  carrierName: string
  productName: string
  monthlyPremium: number
  annualPremium: number
  riskClass?: string // From Compulife: "Preferred Plus", "Standard", etc.
  source: "compulife"
  productCode?: string // Compulife internal product code (e.g., "BANNBONN")
  isGuaranteed?: boolean // true = guaranteed level premium for full term
  amBestRating?: string // AM Best rating from Compulife (e.g., "A+")
  productCategory?: "term" | "rop" | "term-to-age" | "rop-to-age" | "table-rated" | "ul" | "term-comparison" | "final-expense"
  quarterlyPremium?: number
  semiAnnualPremium?: number
  amBestDate?: string // Date of AM Best rating (e.g., "2-13-26")
  healthAnalyzerStatus?: "go" | "nogo" | "unknown" // Per-carrier Health Analyzer result
  healthAnalyzerReason?: string // Rejection/approval reason from Health Analyzer
}

export interface PricingProvider {
  name: string
  getQuotes(request: PricingRequest): Promise<PricingResult[]>
}
