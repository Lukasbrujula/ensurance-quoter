export type ProductType =
  | "term"
  | "wholeLife"
  | "finalExpense"
  | "iul"
  | "accidental"
  | "guaranteedIssue"

export type AmBestRating = "A++" | "A+" | "A" | "A-" | "B++" | "B+" | "NR"

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface Product {
  name: string
  type: ProductType
  ageRange: string
  faceAmountRange: string
  conversionAge: number | null
  isSimplifiedIssue: boolean
  hasROP: boolean
  gradedPeriod: string | null
  /** Structured product parameters from carrier data sheets */
  parameters?: ProductParameters
}

export interface ProductParameters {
  issueAgeMin?: number
  issueAgeMax?: number
  faceAmountMin?: number
  faceAmountMax?: number
  availableTerms?: number[]
  rateClasses?: string[]
  ageCalculation?: "age_last_birthday" | "age_nearest_birthday"
  conversionAgeMax?: number | null
  bandBreakpoints?: number[]
  policyFee?: number | null
  notes?: string
}

// ---------------------------------------------------------------------------
// Tobacco
// ---------------------------------------------------------------------------

export interface TobaccoRules {
  cigarettes: string
  cigars: string
  vaping: string
  smokeless: string
  nrt: string
  marijuana: string
  quitLookback: string
  keyNote: string
  /** Quit lookback in months (structured) — supplements the string quitLookback */
  quitLookbackMonths?: number | null
}

// ---------------------------------------------------------------------------
// Medical conditions (structured)
// ---------------------------------------------------------------------------

export type MedicalDecision =
  | "ACCEPT"
  | "DECLINE"
  | "CONDITIONAL"
  | "MODIFIED"
  | "STANDARD"
  | "REVIEW"

export interface MedicalConditionRule {
  condition: string
  decision: MedicalDecision
  lookbackMonths: number | null
  conditions: string | null
  rateClass: string | null
  riderEligibility?: string | null
  notes: string | null
}

export interface CombinationDecline {
  conditions: string[]
  decision: string
  notes: string | null
}

// ---------------------------------------------------------------------------
// Prescription exclusions
// ---------------------------------------------------------------------------

export type PrescriptionAction = "DECLINE" | "REVIEW" | "ACCEPT" | "GRADED_ELIGIBLE"

export interface PrescriptionExclusion {
  name: string
  action: PrescriptionAction
  associatedCondition: string | null
  notes: string | null
}

export interface PrescriptionExclusions {
  type: string | null
  medications: PrescriptionExclusion[]
  notes: string | null
}

// ---------------------------------------------------------------------------
// Living benefits (structured)
// ---------------------------------------------------------------------------

export interface LivingBenefitRider {
  available: boolean
  type?: string | null
  cost?: string | null
  trigger?: string | null
  maxPercent?: number | null
  maxAmount?: number | null
  notes?: string | null
}

export interface AccidentalDeathBenefit {
  available: boolean
  issueAges?: string | null
  maxAmount?: number | null
  notes?: string | null
}

export interface OtherRider {
  name: string
  cost?: string | null
  availability?: string | null
  description?: string | null
  notes?: string | null
}

export interface LivingBenefitsDetail {
  terminalIllness?: LivingBenefitRider
  criticalIllness?: LivingBenefitRider
  chronicIllness?: LivingBenefitRider
  accidentalDeathBenefit?: AccidentalDeathBenefit
  otherRiders?: OtherRider[]
  exclusionConditions?: string[]
  notes?: string | null
}

// ---------------------------------------------------------------------------
// DUI rules
// ---------------------------------------------------------------------------

export interface DUIRule {
  rule: string
  result: string
  /** Structured DUI data from carrier data sheets */
  lookbackYears?: number | null
  maxIncidentsAllowed?: number | null
  flatExtra?: string | null
  specialRules?: string | null
  declineTriggers?: string | null
}

// ---------------------------------------------------------------------------
// Operational info
// ---------------------------------------------------------------------------

export interface OperationalInfo {
  eSign: boolean
  eSignNote?: string
  declinesReported?: boolean
  phoneInterview?: string
  telesales?: boolean | string
  payments?: string
  /** Structured fields from carrier data sheets */
  underwritingType?: string
  eApp?: boolean
  paymentMethods?: string[]
  commissionAdvance?: string | null
  chargebackSchedule?: string | null
}

// ---------------------------------------------------------------------------
// Rate class criteria
// ---------------------------------------------------------------------------

export interface RateClassThresholds {
  tobaccoFreeMonths?: number | null
  bpMaxSystolic?: number | null
  bpMaxDiastolic?: number | null
  cholesterolMax?: number | null
  cholesterolRatioMax?: number | null
  bmiMin?: number | null
  bmiMax?: number | null
  duiFreeMonths?: number | null
  familyHistory?: string | null
  otherRequirements?: string[]
  notes?: string | null
}

export interface RateClassCriteria {
  preferredPlus?: RateClassThresholds | null
  preferred?: RateClassThresholds | null
  standardPlus?: RateClassThresholds | null
  standard?: RateClassThresholds | null
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Carrier (top-level)
// ---------------------------------------------------------------------------

export interface Carrier {
  id: string
  name: string
  abbr: string
  color: string
  amBest: AmBestRating
  amBestLabel: string
  yearFounded: number
  products: Product[]
  tobacco: TobaccoRules
  /** Human-readable summary — kept for backward compat with existing carriers.ts */
  livingBenefits: string
  dui: DUIRule | null
  operational: OperationalInfo
  /** Legacy free-text medical highlights — kept for backward compat */
  medicalHighlights: Record<string, string>
  statesNotAvailable: string[]

  // --- Structured intelligence data (optional, populated from JSON imports) ---

  /** Structured medical condition rules per product */
  medicalConditions?: MedicalConditionRule[]
  /** Multi-condition decline triggers */
  combinationDeclines?: CombinationDecline[]
  /** Prescription-level exclusion/review data */
  prescriptionExclusions?: PrescriptionExclusions
  /** Structured living benefits breakdown */
  livingBenefitsDetail?: LivingBenefitsDetail
  /** Structured rate class underwriting criteria */
  rateClassCriteria?: RateClassCriteria
  /** Source document references */
  sourceDocuments?: string[]
  /** Whether state data covers all states */
  availableAllStates?: boolean
  /** Notes on state availability beyond the excluded list */
  stateAvailabilityNotes?: string
}
