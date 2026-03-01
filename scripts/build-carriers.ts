/**
 * Carrier Data Build Script
 *
 * Reads extraction JSON files from the Insurance data output directory,
 * transforms them into TypeScript Carrier objects, and generates
 * lib/data/carriers-generated.ts.
 *
 * Usage: bun run scripts/build-carriers.ts
 */

import { readFileSync, readdirSync, writeFileSync } from "fs"
import { join } from "path"

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const EXTRACTION_DIR = "/Users/lukasmargenfeld/clients/Insurance data/output"
const OUTPUT_FILE = join(__dirname, "..", "lib", "data", "carriers-generated.ts")

/** Files to skip entirely */
const SKIP_FILES = new Set(["mountain_life.json"])

/** Map extraction carrier_id → project carrier_id for existing carriers */
const ID_REMAP: Record<string, string> = {
  american_home_life: "americanhomelife",
  better_life: "betterlife",
  illinois_mutual: "illinoismutual",
  transam: "transamerica",
}

/** Existing carrier IDs in the project (these produce UPDATES, not new carriers) */
const EXISTING_IDS = new Set([
  "amam", "foresters", "moo", "jh", "lga", "sbli", "nlg", "transamerica",
  "americo", "uhl", "fg", "aig", "americanhomelife", "baltimore", "betterlife",
  "gtl", "illinoismutual", "pekin", "protective", "corebridge", "lincoln",
  "prudential", "nationwide", "pacific", "principal", "northamerican",
  "securian", "globalatlantic", "massmutual", "newyorklife", "pennmutual",
  "symetra", "brighthouse", "gerber", "colonialpenn", "globelife", "anico",
  "kemper",
])

/** Unique hex colors for new carriers */
const COLOR_PALETTE = [
  "#2E4057", "#048A81", "#8B4513", "#6B3FA0", "#C7522A",
  "#1A535C", "#7B2D8E", "#4A7C59", "#B5651D", "#2F4858",
  "#8E3A59", "#3D5A80", "#5C6BC0", "#00838F", "#6D4C41",
  "#4E342E", "#455A64", "#37474F", "#5D4037", "#1565C0",
  "#2E7D32", "#AD1457", "#6A1B9A", "#00695C", "#EF6C00",
  "#283593",
]

/** AM Best label lookup */
const AM_BEST_LABELS: Record<string, string> = {
  "A++": "Superior",
  "A+": "Superior",
  "A": "Excellent",
  "A-": "Excellent",
  "B++": "Very Good",
  "B+": "Good",
  "NR": "Not Rated",
}

/** Decision priority for deduplication (higher = more restrictive) */
const DECISION_PRIORITY: Record<string, number> = {
  DECLINE: 5,
  MODIFIED: 4,
  CONDITIONAL: 3,
  REVIEW: 2,
  STANDARD: 1,
  ACCEPT: 0,
}

// ---------------------------------------------------------------------------
// Types (extraction JSON schema — snake_case)
// ---------------------------------------------------------------------------

interface ExtractionProduct {
  carrier_id: string
  carrier_name: string
  am_best_rating: string | null
  product_name: string
  product_type: string
  source_documents: string[]
  extraction_date: string
  data_extracted: {
    tobacco_rules: ExtractionTobacco | null
    state_availability: ExtractionStateAvailability | null
    medical_conditions: ExtractionMedicalCondition[] | null
    combination_declines: ExtractionCombinationDecline[] | null
    dui_rules: ExtractionDUI | null
    living_benefits: ExtractionLivingBenefits | null
    prescription_exclusions: ExtractionPrescriptionExclusions | null
    product_parameters: ExtractionProductParams | null
    rate_class_criteria: ExtractionRateClassCriteria | null
    operational_info: ExtractionOperationalInfo | null
    build_chart: unknown
  }
  categories_not_found?: string[]
  notes?: string | null
}

interface ExtractionTobacco {
  cigarettes: string | null
  cigars: string | null
  vaping_ecigs: string | null
  smokeless_chew: string | null
  nrt_pouches: string | null
  marijuana: string | null
  quit_lookback_months: number | null
  notes: string | null
}

interface ExtractionStateAvailability {
  available_all_states: boolean
  excluded_states: string[]
  notes: string | null
}

interface ExtractionMedicalCondition {
  condition: string
  decision: string
  lookback_months: number | null
  conditions: string | null
  rate_class: string | null
  rider_eligibility: string | null
  notes: string | null
}

interface ExtractionCombinationDecline {
  conditions: string[]
  decision: string
  notes: string | null
}

interface ExtractionDUI {
  lookback_years: number | null
  max_incidents_allowed: number | null
  flat_extra: string | null
  special_rules: string | null
  decline_triggers: string | null
  notes: string | null
}

interface ExtractionLivingBenefits {
  terminal_illness: ExtractionRider | null
  critical_illness: ExtractionRider | null
  chronic_illness: ExtractionRider | null
  accidental_death_benefit: ExtractionADB | null
  other_riders: ExtractionOtherRider[] | null
  exclusion_conditions: string[] | null
  notes: string | null
}

interface ExtractionRider {
  available: boolean
  type?: string | null
  cost?: string | null
  trigger?: string | null
  max_percent?: number | null
  max_amount?: number | null
  notes?: string | null
}

interface ExtractionADB {
  available: boolean
  issue_ages?: string | null
  max_amount?: number | null
  notes?: string | null
}

interface ExtractionOtherRider {
  name: string
  cost?: string | null
  availability?: string | null
  description?: string | null
  notes?: string | null
  policy_fee?: unknown
}

interface ExtractionOperationalInfo {
  underwriting_type: string | null
  e_sign: boolean | null
  e_app: boolean | null
  phone_interview: boolean | null
  telesales: boolean | null
  payment_methods: string[] | null
  commission_advance: string | null
  chargeback_schedule: string | null
  notes: string | null
}

interface ExtractionPrescriptionExclusions {
  type: string | null
  medications: ExtractionRx[] | null
  notes: string | null
}

interface ExtractionRx {
  name: string
  action: string
  associated_condition: string | null
  notes: string | null
}

interface ExtractionProductParams {
  issue_age_min: number | null
  issue_age_max: number | null
  face_amount_min: number | null
  face_amount_max: number | null
  available_terms: number[] | null
  rate_classes: string[] | null
  age_calculation: string | null
  conversion_age_max: number | null
  band_breakpoints: number[] | null
  policy_fee: number | null
  notes: string | null
}

interface ExtractionRateClassCriteria {
  preferred_plus?: ExtractionRateClassThresholds | null
  preferred?: ExtractionRateClassThresholds | null
  standard_plus?: ExtractionRateClassThresholds | null
  standard?: ExtractionRateClassThresholds | null
  notes?: string | null
}

interface ExtractionRateClassThresholds {
  tobacco_free_months?: number | null
  bp_max_systolic?: number | null
  bp_max_diastolic?: number | null
  cholesterol_max?: number | null
  cholesterol_ratio_max?: number | null
  bmi_min?: number | null
  bmi_max?: number | null
  dui_free_months?: number | null
  family_history?: string | null
  other_requirements?: string[] | null
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Transformation functions
// ---------------------------------------------------------------------------

function mapProductType(raw: string): string {
  const mapping: Record<string, string> = {
    final_expense: "finalExpense",
    whole_life: "wholeLife",
    guaranteed_issue: "guaranteedIssue",
    term: "term",
    iul: "iul",
    accidental: "accidental",
  }
  return mapping[raw] ?? "wholeLife"
}

function mapTobaccoField(raw: string | null): string {
  if (raw === null) return "Not specified"
  if (raw === "TOBACCO") return "Tobacco rates"
  if (raw === "NON_TOBACCO") return "Non-tobacco rates"
  // CONDITIONAL or descriptive strings — pass through
  return raw
}

function mapAmBest(raw: string | null): string {
  if (!raw) return "NR"
  // Handle formats like "A (Excellent)"
  const match = raw.match(/^([AB][+-]*\+?\+?)/i)
  if (match) {
    const rating = match[1].toUpperCase()
    if (["A++", "A+", "A", "A-", "B++", "B+"].includes(rating)) return rating
  }
  return "NR"
}

function deriveAbbr(name: string): string {
  // Strip parenthetical content and common suffixes
  const cleaned = name
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*(life\s+insurance\s+company|insurance\s+company|life\s+insurance|insurance|company|of\s+america|of\s+north\s+carolina|inc\.?)\s*/gi, " ")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()

  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length === 0) return "UNKN"
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase()
  }
  // Take first letter of each word, max 5 chars
  return words
    .map((w) => w[0])
    .join("")
    .substring(0, 5)
    .toUpperCase()
}

function deriveLivingBenefitsSummary(lb: ExtractionLivingBenefits | null): string {
  if (!lb) return "None specified"
  const parts: string[] = []
  if (lb.terminal_illness?.available) parts.push("Terminal")
  if (lb.critical_illness?.available) parts.push("Critical")
  if (lb.chronic_illness?.available) parts.push("Chronic")
  if (lb.accidental_death_benefit?.available) parts.push("ADB")
  if (parts.length === 0) return "None specified"
  return parts.join(" + ")
}

function deriveMedicalHighlights(
  conditions: ExtractionMedicalCondition[]
): Record<string, string> {
  if (!conditions || conditions.length === 0) return {}

  const highlights: Record<string, string> = {}
  const categories = [
    { key: "diabetesType2", patterns: [/diabetes.*type\s*2/i, /diabetes.*insulin/i, /^diabetes$/i] },
    { key: "anxiety", patterns: [/anxiety/i, /depression/i, /mental\s*health/i] },
    { key: "cardiac", patterns: [/heart/i, /cardiac/i, /coronary/i, /angina/i] },
    { key: "cancer", patterns: [/cancer/i, /carcinoma/i, /melanoma/i, /leukemia/i] },
    { key: "copd", patterns: [/copd/i, /emphysema/i, /chronic.*obstructive/i] },
  ]

  for (const cat of categories) {
    const matched = conditions.filter((c) =>
      cat.patterns.some((p) => p.test(c.condition))
    )
    if (matched.length > 0) {
      const acceptCount = matched.filter(
        (c) => c.decision !== "DECLINE"
      ).length
      const declineCount = matched.filter(
        (c) => c.decision === "DECLINE"
      ).length
      if (declineCount === matched.length) {
        highlights[cat.key] = "DECLINE all"
      } else if (acceptCount > 0) {
        const best = matched.find((c) => c.decision !== "DECLINE")
        highlights[cat.key] = best?.conditions ?? `${acceptCount} of ${matched.length} accepted`
      }
    }
  }

  return highlights
}

function deriveDuiRule(
  dui: ExtractionDUI | null
): { rule: string; result: string; lookbackYears?: number | null; maxIncidentsAllowed?: number | null; flatExtra?: string | null; specialRules?: string | null; declineTriggers?: string | null } | null {
  if (!dui) return null
  // Check if there's any meaningful data
  const hasData = dui.lookback_years !== null
    || dui.max_incidents_allowed !== null
    || dui.decline_triggers !== null
    || dui.special_rules !== null

  if (!hasData && (!dui.notes || dui.notes.toLowerCase().includes("no dui"))) {
    return null
  }

  const parts: string[] = []
  if (dui.lookback_years !== null) parts.push(`${dui.lookback_years} year lookback`)
  if (dui.max_incidents_allowed !== null) parts.push(`max ${dui.max_incidents_allowed} incidents`)
  if (dui.decline_triggers) parts.push(dui.decline_triggers)

  const rule = parts.length > 0 ? parts.join("; ") : (dui.notes ?? "See notes")
  const result = dui.decline_triggers ? "CONDITIONAL" : "DECLINE"

  return {
    rule,
    result,
    lookbackYears: dui.lookback_years,
    maxIncidentsAllowed: dui.max_incidents_allowed,
    flatExtra: dui.flat_extra,
    specialRules: dui.special_rules,
    declineTriggers: dui.decline_triggers,
  }
}

function transformProduct(p: ExtractionProduct) {
  const params = p.data_extracted.product_parameters
  return {
    name: p.product_name,
    type: mapProductType(p.product_type),
    ageRange: params
      ? `${params.issue_age_min ?? "?"}-${params.issue_age_max ?? "?"}`
      : "Not specified",
    faceAmountRange: params
      ? formatFaceAmountRange(params.face_amount_min, params.face_amount_max)
      : "Not specified",
    conversionAge: params?.conversion_age_max ?? null,
    isSimplifiedIssue:
      p.data_extracted.operational_info?.underwriting_type?.toLowerCase().includes("simplified") ?? false,
    hasROP: p.product_name.toLowerCase().includes("rop") || p.product_name.toLowerCase().includes("return of premium"),
    gradedPeriod: p.product_name.toLowerCase().includes("graded") ? "Graded" : null,
    ...(params ? {
      parameters: {
        issueAgeMin: params.issue_age_min ?? undefined,
        issueAgeMax: params.issue_age_max ?? undefined,
        faceAmountMin: params.face_amount_min ?? undefined,
        faceAmountMax: params.face_amount_max ?? undefined,
        availableTerms: params.available_terms ?? undefined,
        rateClasses: params.rate_classes ?? undefined,
        ageCalculation: params.age_calculation === "age_nearest_birthday"
          ? "age_nearest_birthday" as const
          : params.age_calculation === "age_last_birthday"
            ? "age_last_birthday" as const
            : undefined,
        conversionAgeMax: params.conversion_age_max,
        bandBreakpoints: params.band_breakpoints ?? undefined,
        policyFee: params.policy_fee,
        notes: params.notes ?? undefined,
      },
    } : {}),
  }
}

function formatFaceAmountRange(min: number | null, max: number | null): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`
    return `$${n}`
  }
  if (min === null && max === null) return "Not specified"
  if (min === null) return `Up to ${fmt(max!)}`
  if (max === null) return `${fmt(min)}+`
  return `${fmt(min)}-${fmt(max)}`
}

function transformTobacco(products: ExtractionProduct[]) {
  // Use the first product with non-null tobacco data
  const p = products.find((p) => p.data_extracted.tobacco_rules !== null)
  const t = p?.data_extracted.tobacco_rules
  if (!t) {
    return {
      cigarettes: "Not specified",
      cigars: "Not specified",
      vaping: "Not specified",
      smokeless: "Not specified",
      nrt: "Not specified",
      marijuana: "Not specified",
      quitLookback: "Not specified",
      keyNote: "",
      quitLookbackMonths: null as number | null,
    }
  }
  return {
    cigarettes: mapTobaccoField(t.cigarettes),
    cigars: mapTobaccoField(t.cigars),
    vaping: mapTobaccoField(t.vaping_ecigs),
    smokeless: mapTobaccoField(t.smokeless_chew),
    nrt: mapTobaccoField(t.nrt_pouches),
    marijuana: mapTobaccoField(t.marijuana),
    quitLookback: t.quit_lookback_months !== null
      ? `${t.quit_lookback_months} months`
      : "Not specified",
    keyNote: t.notes ?? "",
    quitLookbackMonths: t.quit_lookback_months,
  }
}

function transformLivingBenefitsDetail(lb: ExtractionLivingBenefits | null) {
  if (!lb) return undefined

  const result: Record<string, unknown> = {}

  if (lb.terminal_illness) {
    result.terminalIllness = {
      available: lb.terminal_illness.available ?? false,
      type: lb.terminal_illness.type ?? null,
      cost: lb.terminal_illness.cost ?? null,
      trigger: lb.terminal_illness.trigger ?? null,
      maxPercent: lb.terminal_illness.max_percent ?? null,
      maxAmount: lb.terminal_illness.max_amount ?? null,
      notes: lb.terminal_illness.notes ?? null,
    }
  }
  if (lb.critical_illness) {
    result.criticalIllness = {
      available: lb.critical_illness.available ?? false,
      type: lb.critical_illness.type ?? null,
      cost: lb.critical_illness.cost ?? null,
      trigger: lb.critical_illness.trigger ?? null,
      maxPercent: lb.critical_illness.max_percent ?? null,
      maxAmount: lb.critical_illness.max_amount ?? null,
      notes: lb.critical_illness.notes ?? null,
    }
  }
  if (lb.chronic_illness) {
    result.chronicIllness = {
      available: lb.chronic_illness.available ?? false,
      type: lb.chronic_illness.type ?? null,
      cost: lb.chronic_illness.cost ?? null,
      trigger: lb.chronic_illness.trigger ?? null,
      maxPercent: lb.chronic_illness.max_percent ?? null,
      maxAmount: lb.chronic_illness.max_amount ?? null,
      notes: lb.chronic_illness.notes ?? null,
    }
  }
  if (lb.accidental_death_benefit) {
    result.accidentalDeathBenefit = {
      available: lb.accidental_death_benefit.available ?? false,
      issueAges: lb.accidental_death_benefit.issue_ages ?? null,
      maxAmount: lb.accidental_death_benefit.max_amount ?? null,
      notes: lb.accidental_death_benefit.notes ?? null,
    }
  }
  if (lb.other_riders && lb.other_riders.length > 0) {
    result.otherRiders = lb.other_riders.map((r) => ({
      name: r.name,
      cost: r.cost ?? null,
      availability: r.availability ?? null,
      description: r.description ?? null,
      notes: r.notes ?? null,
    }))
  }
  if (lb.exclusion_conditions && lb.exclusion_conditions.length > 0) {
    result.exclusionConditions = lb.exclusion_conditions
  }
  if (lb.notes) {
    result.notes = lb.notes
  }

  return result
}

function transformRateClassCriteria(rc: ExtractionRateClassCriteria | null) {
  if (!rc) return undefined

  const transformThresholds = (t: ExtractionRateClassThresholds | null | undefined) => {
    if (!t) return null
    return {
      tobaccoFreeMonths: t.tobacco_free_months ?? null,
      bpMaxSystolic: t.bp_max_systolic ?? null,
      bpMaxDiastolic: t.bp_max_diastolic ?? null,
      cholesterolMax: t.cholesterol_max ?? null,
      cholesterolRatioMax: t.cholesterol_ratio_max ?? null,
      bmiMin: t.bmi_min ?? null,
      bmiMax: t.bmi_max ?? null,
      duiFreeMonths: t.dui_free_months ?? null,
      familyHistory: t.family_history ?? null,
      otherRequirements: t.other_requirements ?? undefined,
      notes: t.notes ?? null,
    }
  }

  const result: Record<string, unknown> = {}
  if (rc.preferred_plus) result.preferredPlus = transformThresholds(rc.preferred_plus)
  if (rc.preferred) result.preferred = transformThresholds(rc.preferred)
  if (rc.standard_plus) result.standardPlus = transformThresholds(rc.standard_plus)
  if (rc.standard) result.standard = transformThresholds(rc.standard)
  if (rc.notes) result.notes = rc.notes

  return Object.keys(result).length > 0 ? result : undefined
}

function mergeConditions(
  products: ExtractionProduct[]
): ExtractionMedicalCondition[] {
  const all = products.flatMap((p) => p.data_extracted.medical_conditions ?? [])
  // Deduplicate by condition name, keep most restrictive decision
  const map = new Map<string, ExtractionMedicalCondition>()
  for (const c of all) {
    const key = c.condition.toLowerCase().trim()
    const existing = map.get(key)
    if (!existing) {
      map.set(key, c)
    } else {
      const existingPriority = DECISION_PRIORITY[existing.decision] ?? 0
      const newPriority = DECISION_PRIORITY[c.decision] ?? 0
      if (newPriority > existingPriority) {
        map.set(key, c)
      }
    }
  }
  return Array.from(map.values())
}

function mergePrescriptions(
  products: ExtractionProduct[]
): { type: string | null; medications: ExtractionRx[]; notes: string | null } | undefined {
  const allRx: ExtractionRx[] = []
  let type: string | null = null
  const notes: string[] = []

  for (const p of products) {
    const rx = p.data_extracted.prescription_exclusions
    if (!rx) continue
    if (rx.type && !type) type = rx.type
    if (rx.notes) notes.push(rx.notes)
    if (rx.medications) {
      for (const m of rx.medications) {
        allRx.push(m)
      }
    }
  }

  if (allRx.length === 0) return undefined

  // Deduplicate by medication name, keep most restrictive action
  const rxPriority: Record<string, number> = {
    DECLINE: 3,
    GRADED_ELIGIBLE: 2,
    REVIEW: 1,
    ACCEPT: 0,
  }
  const map = new Map<string, ExtractionRx>()
  for (const r of allRx) {
    const key = r.name.toLowerCase().trim()
    const existing = map.get(key)
    if (!existing) {
      map.set(key, r)
    } else {
      const ep = rxPriority[existing.action] ?? 0
      const np = rxPriority[r.action] ?? 0
      if (np > ep) map.set(key, r)
    }
  }

  return {
    type,
    medications: Array.from(map.values()),
    notes: notes.length > 0 ? notes.join("; ") : null,
  }
}

function mergeCombinationDeclines(
  products: ExtractionProduct[]
): ExtractionCombinationDecline[] | undefined {
  const all = products.flatMap(
    (p) => p.data_extracted.combination_declines ?? []
  )
  if (all.length === 0) return undefined

  // Deduplicate by sorted conditions list
  const map = new Map<string, ExtractionCombinationDecline>()
  for (const cd of all) {
    const key = [...cd.conditions].sort().join("|").toLowerCase()
    if (!map.has(key)) map.set(key, cd)
  }
  return Array.from(map.values())
}

function transformOperational(products: ExtractionProduct[]) {
  const p = products.find((p) => p.data_extracted.operational_info !== null)
  const op = p?.data_extracted.operational_info
  if (!op) return { eSign: false }

  return {
    eSign: op.e_sign ?? false,
    eSignNote: op.e_sign ? undefined : "No e-sign documented",
    declinesReported: undefined,
    phoneInterview: op.phone_interview ? "Available" : undefined,
    telesales: op.telesales ?? undefined,
    payments: op.payment_methods?.join(", ") ?? undefined,
    underwritingType: op.underwriting_type ?? undefined,
    eApp: op.e_app ?? undefined,
    paymentMethods: op.payment_methods ?? undefined,
    commissionAdvance: typeof op.commission_advance === "string"
      ? op.commission_advance
      : op.commission_advance === true
        ? "Available"
        : null,
    chargebackSchedule: op.chargeback_schedule ?? null,
  }
}

function getStatesList(products: ExtractionProduct[]): string[] {
  for (const p of products) {
    const sa = p.data_extracted.state_availability
    if (sa && sa.excluded_states && sa.excluded_states.length > 0) {
      return sa.excluded_states
    }
  }
  return []
}

function getAvailableAllStates(products: ExtractionProduct[]): boolean {
  for (const p of products) {
    const sa = p.data_extracted.state_availability
    if (sa) return sa.available_all_states
  }
  return false
}

function getStateAvailabilityNotes(products: ExtractionProduct[]): string | undefined {
  for (const p of products) {
    const sa = p.data_extracted.state_availability
    if (sa?.notes) return sa.notes
  }
  return undefined
}

function getSourceDocuments(products: ExtractionProduct[]): string[] {
  const docs = new Set<string>()
  for (const p of products) {
    for (const d of p.source_documents ?? []) {
      docs.add(d)
    }
  }
  return Array.from(docs)
}

// ---------------------------------------------------------------------------
// Main build logic
// ---------------------------------------------------------------------------

interface CarrierData {
  id: string
  name: string
  abbr: string
  color: string
  amBest: string
  amBestLabel: string
  yearFounded: number
  products: ReturnType<typeof transformProduct>[]
  tobacco: ReturnType<typeof transformTobacco>
  livingBenefits: string
  dui: ReturnType<typeof deriveDuiRule>
  operational: ReturnType<typeof transformOperational>
  medicalHighlights: Record<string, string>
  statesNotAvailable: string[]
  medicalConditions?: Array<{
    condition: string
    decision: string
    lookbackMonths: number | null
    conditions: string | null
    rateClass: string | null
    riderEligibility: string | null
    notes: string | null
  }>
  combinationDeclines?: Array<{
    conditions: string[]
    decision: string
    notes: string | null
  }>
  prescriptionExclusions?: {
    type: string | null
    medications: Array<{
      name: string
      action: string
      associatedCondition: string | null
      notes: string | null
    }>
    notes: string | null
  }
  livingBenefitsDetail?: ReturnType<typeof transformLivingBenefitsDetail>
  rateClassCriteria?: ReturnType<typeof transformRateClassCriteria>
  sourceDocuments?: string[]
  availableAllStates?: boolean
  stateAvailabilityNotes?: string
}

interface ExistingCarrierUpdate {
  medicalConditions?: CarrierData["medicalConditions"]
  combinationDeclines?: CarrierData["combinationDeclines"]
  prescriptionExclusions?: CarrierData["prescriptionExclusions"]
  livingBenefitsDetail?: CarrierData["livingBenefitsDetail"]
  rateClassCriteria?: CarrierData["rateClassCriteria"]
  sourceDocuments?: string[]
  availableAllStates?: boolean
  stateAvailabilityNotes?: string
  tobacco?: CarrierData["tobacco"]
  additionalProducts?: CarrierData["products"]
}

function buildCarrier(
  carrierId: string,
  products: ExtractionProduct[],
  colorIndex: number
): { carrier: CarrierData; isExisting: boolean } {
  const first = products[0]
  const isExisting = EXISTING_IDS.has(carrierId)
  const conditions = mergeConditions(products)
  const rx = mergePrescriptions(products)
  const combos = mergeCombinationDeclines(products)

  // Find first product with living benefits data
  const lbProduct = products.find((p) => p.data_extracted.living_benefits !== null)
  const lb = lbProduct?.data_extracted.living_benefits ?? null

  // Find first product with rate class criteria
  const rcProduct = products.find((p) => p.data_extracted.rate_class_criteria !== null)
  const rc = rcProduct?.data_extracted.rate_class_criteria ?? null

  const amBest = mapAmBest(first.am_best_rating)

  const carrier: CarrierData = {
    id: carrierId,
    name: first.carrier_name,
    abbr: deriveAbbr(first.carrier_name),
    color: COLOR_PALETTE[colorIndex % COLOR_PALETTE.length],
    amBest,
    amBestLabel: AM_BEST_LABELS[amBest] ?? "Not Rated",
    yearFounded: 0,
    products: products.map(transformProduct),
    tobacco: transformTobacco(products),
    livingBenefits: deriveLivingBenefitsSummary(lb),
    dui: deriveDuiRule(products.find((p) => p.data_extracted.dui_rules !== null)?.data_extracted.dui_rules ?? null),
    operational: transformOperational(products),
    medicalHighlights: deriveMedicalHighlights(conditions),
    statesNotAvailable: getStatesList(products),
    ...(conditions.length > 0
      ? {
          medicalConditions: conditions.map((c) => ({
            condition: c.condition,
            decision: c.decision,
            lookbackMonths: c.lookback_months,
            conditions: c.conditions,
            rateClass: c.rate_class,
            riderEligibility: c.rider_eligibility ?? null,
            notes: c.notes,
          })),
        }
      : {}),
    ...(combos ? { combinationDeclines: combos } : {}),
    ...(rx
      ? {
          prescriptionExclusions: {
            type: rx.type,
            medications: rx.medications.map((m) => ({
              name: m.name,
              action: m.action,
              associatedCondition: m.associated_condition,
              notes: m.notes,
            })),
            notes: rx.notes,
          },
        }
      : {}),
    ...(lb ? { livingBenefitsDetail: transformLivingBenefitsDetail(lb) } : {}),
    ...(rc ? { rateClassCriteria: transformRateClassCriteria(rc) } : {}),
    sourceDocuments: getSourceDocuments(products),
    availableAllStates: getAvailableAllStates(products) || undefined,
    stateAvailabilityNotes: getStateAvailabilityNotes(products),
  }

  return { carrier, isExisting }
}

function extractUpdate(carrier: CarrierData): ExistingCarrierUpdate {
  const update: ExistingCarrierUpdate = {}
  if (carrier.medicalConditions && carrier.medicalConditions.length > 0) {
    update.medicalConditions = carrier.medicalConditions
  }
  if (carrier.combinationDeclines && carrier.combinationDeclines.length > 0) {
    update.combinationDeclines = carrier.combinationDeclines
  }
  if (carrier.prescriptionExclusions) {
    update.prescriptionExclusions = carrier.prescriptionExclusions
  }
  if (carrier.livingBenefitsDetail) {
    update.livingBenefitsDetail = carrier.livingBenefitsDetail
  }
  if (carrier.rateClassCriteria) {
    update.rateClassCriteria = carrier.rateClassCriteria
  }
  if (carrier.sourceDocuments && carrier.sourceDocuments.length > 0) {
    update.sourceDocuments = carrier.sourceDocuments
  }
  if (carrier.availableAllStates !== undefined) {
    update.availableAllStates = carrier.availableAllStates
  }
  if (carrier.stateAvailabilityNotes) {
    update.stateAvailabilityNotes = carrier.stateAvailabilityNotes
  }
  // Include tobacco corrections
  update.tobacco = carrier.tobacco
  // Include products from extraction
  update.additionalProducts = carrier.products
  return update
}

// ---------------------------------------------------------------------------
// Code generation helpers
// ---------------------------------------------------------------------------

function toTypescriptLiteral(obj: unknown, indent = 2, currentIndent = 0): string {
  const pad = " ".repeat(currentIndent)
  const innerPad = " ".repeat(currentIndent + indent)

  if (obj === null) return "null"
  if (obj === undefined) return "undefined"
  if (typeof obj === "string") {
    // Escape special characters
    const escaped = obj
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
    return `"${escaped}"`
  }
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj)

  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]"
    // For string arrays, keep on one line if short enough
    if (obj.every((item) => typeof item === "string") && JSON.stringify(obj).length < 120) {
      return `[${obj.map((item) => toTypescriptLiteral(item)).join(", ")}]`
    }
    if (obj.every((item) => typeof item === "number") && obj.length < 20) {
      return `[${obj.map((item) => String(item)).join(", ")}]`
    }
    const items = obj.map(
      (item) => `${innerPad}${toTypescriptLiteral(item, indent, currentIndent + indent)},`
    )
    return `[\n${items.join("\n")}\n${pad}]`
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return "{}"

    const lines = entries.map(([key, value]) => {
      const k = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
      return `${innerPad}${k}: ${toTypescriptLiteral(value, indent, currentIndent + indent)},`
    })
    return `{\n${lines.join("\n")}\n${pad}}`
  }

  return String(obj)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const files = readdirSync(EXTRACTION_DIR)
    .filter((f) => f.endsWith(".json") && !SKIP_FILES.has(f))
    .sort()

  const newCarriers: CarrierData[] = []
  const existingUpdates: Record<string, ExistingCarrierUpdate> = {}
  let colorIndex = 0
  const stats = { total: 0, existing: 0, new: 0, skipped: 0, errors: 0 }

  for (const file of files) {
    stats.total++
    const filePath = join(EXTRACTION_DIR, file)
    let products: ExtractionProduct[]

    try {
      const raw = readFileSync(filePath, "utf-8")
      products = JSON.parse(raw)
    } catch (err) {
      console.error(`ERROR: Failed to parse ${file}: ${err}`)
      stats.errors++
      continue
    }

    if (!Array.isArray(products) || products.length === 0) {
      console.warn(`WARN: ${file} is empty or not an array, skipping`)
      stats.skipped++
      continue
    }

    const rawId = products[0].carrier_id
    const carrierId = ID_REMAP[rawId] ?? rawId

    const { carrier, isExisting } = buildCarrier(carrierId, products, colorIndex)

    if (isExisting) {
      existingUpdates[carrierId] = extractUpdate(carrier)
      stats.existing++
      console.log(
        `UPDATE: ${carrierId} — ${carrier.medicalConditions?.length ?? 0} conditions, ` +
        `${carrier.prescriptionExclusions?.medications?.length ?? 0} Rx, ` +
        `${carrier.products.length} products`
      )
    } else {
      newCarriers.push(carrier)
      colorIndex++
      stats.new++
      console.log(
        `NEW: ${carrierId} (${carrier.name}) — ${carrier.medicalConditions?.length ?? 0} conditions, ` +
        `${carrier.prescriptionExclusions?.medications?.length ?? 0} Rx, ` +
        `${carrier.products.length} products`
      )
    }
  }

  // Generate TypeScript output
  const output = generateOutput(newCarriers, existingUpdates)
  writeFileSync(OUTPUT_FILE, output, "utf-8")

  console.log("\n--- Summary ---")
  console.log(`Total files processed: ${stats.total}`)
  console.log(`Existing carrier updates: ${stats.existing}`)
  console.log(`New carriers added: ${stats.new}`)
  console.log(`Skipped: ${stats.skipped}`)
  console.log(`Errors: ${stats.errors}`)
  console.log(`Output written to: ${OUTPUT_FILE}`)
}

function generateOutput(
  newCarriers: CarrierData[],
  existingUpdates: Record<string, ExistingCarrierUpdate>
): string {
  const lines: string[] = []

  lines.push(`/**`)
  lines.push(` * AUTO-GENERATED — DO NOT EDIT`)
  lines.push(` *`)
  lines.push(` * Generated by: bun run scripts/build-carriers.ts`)
  lines.push(` * Source: /Users/lukasmargenfeld/clients/Insurance data/output/`)
  lines.push(` * Date: ${new Date().toISOString().split("T")[0]}`)
  lines.push(` * New carriers: ${newCarriers.length}`)
  lines.push(` * Existing carrier updates: ${Object.keys(existingUpdates).length}`)
  lines.push(` */`)
  lines.push(``)
  lines.push(`import type { Carrier } from "@/lib/types"`)
  lines.push(``)

  // Generate new carriers
  lines.push(`/**`)
  lines.push(` * New carriers from extraction database.`)
  lines.push(` * These are appended to the CARRIERS array in carriers.ts.`)
  lines.push(` */`)
  lines.push(`export const GENERATED_CARRIERS: Carrier[] = ${toTypescriptLiteral(newCarriers)}`)
  lines.push(``)

  // Generate update type
  lines.push(`/**`)
  lines.push(` * Update payload for existing carriers.`)
  lines.push(` * Structured intelligence fields to merge into existing carrier objects.`)
  lines.push(` */`)
  lines.push(`export interface CarrierUpdate {`)
  lines.push(`  medicalConditions?: Carrier["medicalConditions"]`)
  lines.push(`  combinationDeclines?: Carrier["combinationDeclines"]`)
  lines.push(`  prescriptionExclusions?: Carrier["prescriptionExclusions"]`)
  lines.push(`  livingBenefitsDetail?: Carrier["livingBenefitsDetail"]`)
  lines.push(`  rateClassCriteria?: Carrier["rateClassCriteria"]`)
  lines.push(`  sourceDocuments?: string[]`)
  lines.push(`  availableAllStates?: boolean`)
  lines.push(`  stateAvailabilityNotes?: string`)
  lines.push(`  tobacco?: Carrier["tobacco"]`)
  lines.push(`  additionalProducts?: Carrier["products"]`)
  lines.push(`}`)
  lines.push(``)

  // Generate existing updates record
  lines.push(`/**`)
  lines.push(` * Updates for existing carriers — keyed by carrier ID.`)
  lines.push(` * carriers.ts merges these into the corresponding existing carrier objects.`)
  lines.push(` */`)
  lines.push(`export const EXISTING_CARRIER_UPDATES: Record<string, CarrierUpdate> = ${toTypescriptLiteral(existingUpdates)}`)
  lines.push(``)

  return lines.join("\n")
}

main()
