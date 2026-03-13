import type { EnrichmentResult } from "./ai"
import type { LeadSource } from "./database"
import type { Gender, NicotineType, QuoteRequest, QuoteResponse, TobaccoStatus } from "./quote"
import type { LeadPreScreen } from "@/lib/engine/pre-screen"

/* ------------------------------------------------------------------ */
/*  Lead status + domain enums                                         */
/* ------------------------------------------------------------------ */

export type LeadStatus = "new" | "contacted" | "quoted" | "applied" | "issued" | "dead"

export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "domestic_partner"

export type IncomeRange =
  | "under_25k"
  | "25k_50k"
  | "50k_75k"
  | "75k_100k"
  | "100k_150k"
  | "150k_250k"
  | "over_250k"

/* ------------------------------------------------------------------ */
/*  Lead — first-class entity that composes all per-prospect data      */
/* ------------------------------------------------------------------ */

export interface Lead {
  id: string
  agentId: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  state: string | null
  age: number | null
  gender: Gender | null
  tobaccoStatus: TobaccoStatus | null
  nicotineType: NicotineType | null
  medicalConditions: string[]
  duiHistory: boolean
  yearsSinceLastDui: number | null
  heightFeet: number | null
  heightInches: number | null
  weight: number | null
  coverageAmount: number | null
  termLength: number | null
  source: LeadSource
  rawCsvData: Record<string, unknown> | null

  // Personal/contact (Phase 6)
  dateOfBirth: string | null
  address: string | null
  city: string | null
  zipCode: string | null
  maritalStatus: MaritalStatus | null

  // Financial/professional (Phase 6)
  occupation: string | null
  incomeRange: IncomeRange | null
  dependents: number | null
  existingCoverage: string | null

  // CRM workflow (Phase 6)
  status: LeadStatus
  statusUpdatedAt: string | null
  followUpDate: string | null
  followUpNote: string | null
  notes: string | null

  // SMS reminder (follow-up automation)
  smsReminder: boolean
  smsReminderSentAt: string | null

  // Inbox flags
  starred: boolean
  urgent: boolean

  // Google Calendar (Phase 10)
  googleEventId: string | null

  // Pre-screen (Phase 11)
  preScreen: LeadPreScreen | null

  enrichment: EnrichmentResult | null
  quoteHistory: LeadQuoteSnapshot[]

  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/*  Quote snapshot — one run of the quote engine for a lead            */
/* ------------------------------------------------------------------ */

export interface LeadQuoteSnapshot {
  id: string
  request: QuoteRequest
  response: QuoteResponse
  createdAt: string
}
