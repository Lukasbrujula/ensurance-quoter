/* ------------------------------------------------------------------ */
/*  Supabase Database Types                                            */
/*  Auto-generated via: supabase gen types typescript                   */
/*  Re-export generated types + stricter domain aliases                 */
/* ------------------------------------------------------------------ */

export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.generated"

export type { Database as default } from "./database.generated"

/* ------------------------------------------------------------------ */
/*  Stricter domain aliases (preserve check-constraint semantics)      */
/* ------------------------------------------------------------------ */

export type LeadSource = "csv" | "ringba" | "manual" | "api" | "ai_agent"

export type CallDirection = "inbound" | "outbound"

export type CallProvider = "telnyx" | "ringba"

/* ------------------------------------------------------------------ */
/*  Row types — stricter than generated (preserves check constraints)  */
/* ------------------------------------------------------------------ */

export type LeadStatus = "new" | "contacted" | "quoted" | "applied" | "issued" | "closed"

export type MaritalStatusDb = "single" | "married" | "divorced" | "widowed" | "domestic_partner"

export type IncomeRangeDb = "under_25k" | "25k_50k" | "50k_75k" | "75k_100k" | "100k_150k" | "150k_250k" | "over_250k"

export interface LeadRow {
  id: string
  agent_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  state: string | null
  age: number | null
  gender: "Male" | "Female" | null
  tobacco_status: "non-smoker" | "smoker" | null
  medical_conditions: string[] | null
  dui_history: boolean | null
  years_since_last_dui: number | null
  coverage_amount: number | null
  term_length: number | null
  source: LeadSource
  raw_csv_data: Record<string, unknown> | null
  // Phase 6: personal/contact
  date_of_birth: string | null
  address: string | null
  city: string | null
  zip_code: string | null
  marital_status: MaritalStatusDb | null
  // Phase 6: financial/professional
  occupation: string | null
  income_range: IncomeRangeDb | null
  dependents: number | null
  existing_coverage: string | null
  // Phase 6: CRM workflow
  status: LeadStatus
  status_updated_at: string | null
  follow_up_date: string | null
  follow_up_note: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EnrichmentRow {
  id: string
  lead_id: string
  pdl_data: Record<string, unknown>
  enriched_at: string
}

export interface QuoteRow {
  id: string
  lead_id: string
  request_data: Record<string, unknown>
  response_data: Record<string, unknown>
  created_at: string
}

export interface CallLogRow {
  id: string
  lead_id: string
  direction: CallDirection
  provider: CallProvider
  provider_call_id: string | null
  duration_seconds: number | null
  recording_url: string | null
  transcript_text: string | null
  ai_summary: string | null
  coaching_hints: CoachingHintJson[] | null
  started_at: string | null
  ended_at: string | null
}

export interface AgentSettingsRow {
  id: string
  user_id: string
  default_first_year_percent: number
  default_renewal_percent: number
  carrier_commissions: Record<string, unknown>[]
  telnyx_ai_assistant_id: string | null
  telnyx_ai_enabled: boolean | null
  created_at: string
  updated_at: string
}

export interface ActivityLogRow {
  id: string
  lead_id: string
  agent_id: string
  activity_type: string
  title: string
  details: Record<string, unknown> | null
  created_at: string
}

export interface CoachingHintJson {
  type: string
  text: string
  timestamp: number
  relatedCarriers: string[]
}

/* ------------------------------------------------------------------ */
/*  Insert types                                                       */
/* ------------------------------------------------------------------ */

export interface LeadInsert {
  id?: string
  agent_id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  state?: string | null
  age?: number | null
  gender?: "Male" | "Female" | null
  tobacco_status?: "non-smoker" | "smoker" | null
  medical_conditions?: string[] | null
  dui_history?: boolean | null
  years_since_last_dui?: number | null
  coverage_amount?: number | null
  term_length?: number | null
  source?: LeadSource
  raw_csv_data?: Record<string, unknown> | null
  // Phase 6: personal/contact
  date_of_birth?: string | null
  address?: string | null
  city?: string | null
  zip_code?: string | null
  marital_status?: MaritalStatusDb | null
  // Phase 6: financial/professional
  occupation?: string | null
  income_range?: IncomeRangeDb | null
  dependents?: number | null
  existing_coverage?: string | null
  // Phase 6: CRM workflow
  status?: LeadStatus
  status_updated_at?: string | null
  follow_up_date?: string | null
  follow_up_note?: string | null
  notes?: string | null
}

export interface EnrichmentInsert {
  id?: string
  lead_id: string
  pdl_data: Record<string, unknown>
}

export interface QuoteInsert {
  id?: string
  lead_id: string
  request_data: Record<string, unknown>
  response_data: Record<string, unknown>
}

export interface CallLogInsert {
  id?: string
  lead_id: string
  direction: CallDirection
  provider: CallProvider
  provider_call_id?: string | null
  duration_seconds?: number | null
  recording_url?: string | null
  transcript_text?: string | null
  ai_summary?: string | null
  coaching_hints?: CoachingHintJson[] | null
  started_at?: string | null
  ended_at?: string | null
}

/* ------------------------------------------------------------------ */
/*  Update types                                                       */
/* ------------------------------------------------------------------ */

export type LeadUpdate = Partial<Omit<LeadInsert, "id">>

export type EnrichmentUpdate = Partial<Omit<EnrichmentInsert, "id">>

export type QuoteUpdate = Partial<Omit<QuoteInsert, "id">>

export type CallLogUpdate = Partial<Omit<CallLogInsert, "id">>
