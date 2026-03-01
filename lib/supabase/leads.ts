import { createAuthClient } from "./auth-server"
import type { DbClient } from "./server"
import { phoneLast10 } from "@/lib/utils/phone"
import type { Lead, LeadQuoteSnapshot } from "@/lib/types/lead"
import type { EnrichmentResult } from "@/lib/types/ai"
import type { LeadPreScreen } from "@/lib/engine/pre-screen"
import type { Gender, NicotineType, TobaccoStatus } from "@/lib/types/quote"
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/lib/types/database.generated"
import type { LeadSource } from "@/lib/types/database"
import type { LeadStatus, MaritalStatus, IncomeRange } from "@/lib/types/lead"

type LeadDbRow = Tables<"leads">
type LeadDbInsert = TablesInsert<"leads">
type LeadDbUpdate = TablesUpdate<"leads">

/* ------------------------------------------------------------------ */
/*  Row <-> Lead mapping                                               */
/* ------------------------------------------------------------------ */

function rowToLead(
  row: LeadDbRow,
  enrichment: EnrichmentResult | null = null,
  quoteHistory: LeadQuoteSnapshot[] = []
): Lead {
  return {
    id: row.id,
    agentId: row.agent_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    state: row.state,
    age: row.age,
    gender: (row.gender as Gender) ?? null,
    tobaccoStatus: (row.tobacco_status as TobaccoStatus) ?? null,
    nicotineType: (row.nicotine_type as NicotineType) ?? null,
    medicalConditions: row.medical_conditions ?? [],
    duiHistory: row.dui_history ?? false,
    yearsSinceLastDui: row.years_since_last_dui,
    heightFeet: row.height_feet ?? null,
    heightInches: row.height_inches ?? null,
    weight: row.weight != null ? Number(row.weight) : null,
    coverageAmount: row.coverage_amount,
    termLength: row.term_length,
    source: row.source as LeadSource,
    rawCsvData: row.raw_csv_data as Record<string, unknown> | null,
    // Phase 6: personal/contact
    dateOfBirth: row.date_of_birth ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    zipCode: row.zip_code ?? null,
    maritalStatus: (row.marital_status as MaritalStatus) ?? null,
    // Phase 6: financial/professional
    occupation: row.occupation ?? null,
    incomeRange: (row.income_range as IncomeRange) ?? null,
    dependents: row.dependents ?? null,
    existingCoverage: row.existing_coverage ?? null,
    // Phase 6: CRM workflow
    status: (row.status as LeadStatus) ?? "new",
    statusUpdatedAt: row.status_updated_at ?? null,
    followUpDate: row.follow_up_date ?? null,
    followUpNote: row.follow_up_note ?? null,
    notes: row.notes ?? null,
    // SMS reminder
    smsReminder: (row as Record<string, unknown>).sms_reminder as boolean ?? false,
    smsReminderSentAt: ((row as Record<string, unknown>).sms_reminder_sent_at as string) ?? null,
    // Google Calendar (Phase 10)
    googleEventId: row.google_event_id ?? null,
    // Pre-screen (Phase 11)
    preScreen: row.pre_screen as unknown as LeadPreScreen | null,
    enrichment,
    quoteHistory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function leadToInsert(lead: Partial<Lead> & { agentId: string }): LeadDbInsert {
  const row: LeadDbInsert = {
    agent_id: lead.agentId,
    medical_conditions: lead.medicalConditions ?? [],
    dui_history: lead.duiHistory ?? false,
    source: lead.source ?? "manual",
    status: lead.status ?? "new",
  }

  // Only include defined fields — Supabase JS sends all object keys
  // in the columns= query parameter, and PostgREST rejects undefined values.
  if (lead.id !== undefined) row.id = lead.id
  if (lead.firstName !== undefined) row.first_name = lead.firstName
  if (lead.lastName !== undefined) row.last_name = lead.lastName
  if (lead.email !== undefined) row.email = lead.email
  if (lead.phone !== undefined) row.phone = lead.phone
  if (lead.state !== undefined) row.state = lead.state
  if (lead.age !== undefined) row.age = lead.age
  if (lead.gender !== undefined) row.gender = lead.gender
  if (lead.tobaccoStatus !== undefined) row.tobacco_status = lead.tobaccoStatus
  if (lead.nicotineType !== undefined) row.nicotine_type = lead.nicotineType
  if (lead.yearsSinceLastDui !== undefined) row.years_since_last_dui = lead.yearsSinceLastDui
  if (lead.heightFeet !== undefined) row.height_feet = lead.heightFeet
  if (lead.heightInches !== undefined) row.height_inches = lead.heightInches
  if (lead.weight !== undefined) row.weight = lead.weight
  if (lead.coverageAmount !== undefined) row.coverage_amount = lead.coverageAmount
  if (lead.termLength !== undefined) row.term_length = lead.termLength
  if (lead.rawCsvData !== undefined) row.raw_csv_data = lead.rawCsvData as Json
  if (lead.dateOfBirth !== undefined) row.date_of_birth = lead.dateOfBirth
  if (lead.address !== undefined) row.address = lead.address
  if (lead.city !== undefined) row.city = lead.city
  if (lead.zipCode !== undefined) row.zip_code = lead.zipCode
  if (lead.maritalStatus !== undefined) row.marital_status = lead.maritalStatus
  if (lead.occupation !== undefined) row.occupation = lead.occupation
  if (lead.incomeRange !== undefined) row.income_range = lead.incomeRange
  if (lead.dependents !== undefined) row.dependents = lead.dependents
  if (lead.existingCoverage !== undefined) row.existing_coverage = lead.existingCoverage
  if (lead.statusUpdatedAt !== undefined) row.status_updated_at = lead.statusUpdatedAt
  if (lead.followUpDate !== undefined) row.follow_up_date = lead.followUpDate
  if (lead.followUpNote !== undefined) row.follow_up_note = lead.followUpNote
  if (lead.notes !== undefined) row.notes = lead.notes
  if (lead.googleEventId !== undefined) row.google_event_id = lead.googleEventId
  if (lead.preScreen !== undefined) row.pre_screen = lead.preScreen as unknown as Json
  if (lead.smsReminder !== undefined) (row as Record<string, unknown>).sms_reminder = lead.smsReminder

  return row
}

function leadToUpdate(fields: Partial<Lead>): LeadDbUpdate {
  const update: LeadDbUpdate = {}
  if (fields.firstName !== undefined) update.first_name = fields.firstName
  if (fields.lastName !== undefined) update.last_name = fields.lastName
  if (fields.email !== undefined) update.email = fields.email
  if (fields.phone !== undefined) update.phone = fields.phone
  if (fields.state !== undefined) update.state = fields.state
  if (fields.age !== undefined) update.age = fields.age
  if (fields.gender !== undefined) update.gender = fields.gender
  if (fields.tobaccoStatus !== undefined) update.tobacco_status = fields.tobaccoStatus
  if (fields.nicotineType !== undefined) update.nicotine_type = fields.nicotineType
  if (fields.medicalConditions !== undefined) update.medical_conditions = fields.medicalConditions
  if (fields.duiHistory !== undefined) update.dui_history = fields.duiHistory
  if (fields.yearsSinceLastDui !== undefined) update.years_since_last_dui = fields.yearsSinceLastDui
  if (fields.heightFeet !== undefined) update.height_feet = fields.heightFeet
  if (fields.heightInches !== undefined) update.height_inches = fields.heightInches
  if (fields.weight !== undefined) update.weight = fields.weight
  if (fields.coverageAmount !== undefined) update.coverage_amount = fields.coverageAmount
  if (fields.termLength !== undefined) update.term_length = fields.termLength
  if (fields.source !== undefined) update.source = fields.source
  if (fields.rawCsvData !== undefined) update.raw_csv_data = fields.rawCsvData as Json
  // Phase 6: personal/contact
  if (fields.dateOfBirth !== undefined) update.date_of_birth = fields.dateOfBirth
  if (fields.address !== undefined) update.address = fields.address
  if (fields.city !== undefined) update.city = fields.city
  if (fields.zipCode !== undefined) update.zip_code = fields.zipCode
  if (fields.maritalStatus !== undefined) update.marital_status = fields.maritalStatus
  // Phase 6: financial/professional
  if (fields.occupation !== undefined) update.occupation = fields.occupation
  if (fields.incomeRange !== undefined) update.income_range = fields.incomeRange
  if (fields.dependents !== undefined) update.dependents = fields.dependents
  if (fields.existingCoverage !== undefined) update.existing_coverage = fields.existingCoverage
  // Phase 6: CRM workflow
  if (fields.status !== undefined) update.status = fields.status
  if (fields.statusUpdatedAt !== undefined) update.status_updated_at = fields.statusUpdatedAt
  if (fields.followUpDate !== undefined) {
    update.follow_up_date = fields.followUpDate
    // Reset sent-at when follow-up date changes so cron can re-send
    ;(update as Record<string, unknown>).sms_reminder_sent_at = null
  }
  if (fields.followUpNote !== undefined) update.follow_up_note = fields.followUpNote
  if (fields.notes !== undefined) update.notes = fields.notes
  // SMS reminder
  if (fields.smsReminder !== undefined) (update as Record<string, unknown>).sms_reminder = fields.smsReminder
  if (fields.smsReminderSentAt !== undefined) (update as Record<string, unknown>).sms_reminder_sent_at = fields.smsReminderSentAt
  // Google Calendar (Phase 10)
  if (fields.googleEventId !== undefined) update.google_event_id = fields.googleEventId
  // Pre-screen (Phase 11)
  if (fields.preScreen !== undefined) update.pre_screen = fields.preScreen as unknown as Json
  return update
}

/* ------------------------------------------------------------------ */
/*  Data access functions                                              */
/*  All single-record operations filter by agent_id for ownership.    */
/* ------------------------------------------------------------------ */

export async function getLeads(agentId: string): Promise<Lead[]> {
  const supabase = await createAuthClient()

  const { data: rows, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) throw new Error("Failed to load leads")

  return (rows ?? []).map((row) => rowToLead(row))
}

export async function getLead(id: string, agentId: string): Promise<Lead | null> {
  const supabase = await createAuthClient()

  const { data: row, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("agent_id", agentId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error("Failed to load lead")
  }

  // Load enrichment (latest)
  const { data: enrichmentRows } = await supabase
    .from("enrichments")
    .select("*")
    .eq("lead_id", id)
    .order("enriched_at", { ascending: false })
    .limit(1)

  const enrichment = enrichmentRows?.[0]
    ? (enrichmentRows[0].pdl_data as unknown as EnrichmentResult)
    : null

  // Load quote history
  const { data: quoteRows } = await supabase
    .from("quotes")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })

  const quoteHistory: LeadQuoteSnapshot[] = (quoteRows ?? []).map((q) => ({
    id: q.id,
    request: q.request_data as unknown as LeadQuoteSnapshot["request"],
    response: q.response_data as unknown as LeadQuoteSnapshot["response"],
    createdAt: q.created_at,
  }))

  return rowToLead(row, enrichment, quoteHistory)
}

export async function insertLead(
  lead: Partial<Lead> & { agentId: string }
): Promise<Lead> {
  const supabase = await createAuthClient()

  const { data: row, error } = await supabase
    .from("leads")
    .insert(leadToInsert(lead))
    .select()
    .single()

  if (error) throw new Error("Failed to insert lead")

  return rowToLead(row)
}

export async function insertLeadsBatch(
  leads: Array<Partial<Lead> & { agentId: string }>
): Promise<Lead[]> {
  const supabase = await createAuthClient()
  const inserts = leads.map(leadToInsert)

  const { data: rows, error } = await supabase
    .from("leads")
    .insert(inserts)
    .select()

  if (error) {
    console.error("[insertLeadsBatch] Supabase error:", error.message, error.details, error.hint)
    throw new Error(`Failed to batch insert leads: ${error.message}`)
  }

  return (rows ?? []).map((row) => rowToLead(row))
}

export async function updateLead(
  id: string,
  agentId: string,
  fields: Partial<Lead>
): Promise<Lead> {
  const supabase = await createAuthClient()

  const { data: row, error } = await supabase
    .from("leads")
    .update(leadToUpdate(fields))
    .eq("id", id)
    .eq("agent_id", agentId)
    .select()
    .single()

  if (error) throw new Error("Failed to update lead")

  return rowToLead(row)
}

export async function deleteLead(id: string, agentId: string): Promise<void> {
  const supabase = await createAuthClient()

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("agent_id", agentId)

  if (error) throw new Error("Failed to delete lead")
}

/**
 * Save enrichment — verifies lead ownership before inserting.
 */
export async function saveEnrichment(
  leadId: string,
  agentId: string,
  enrichment: EnrichmentResult
): Promise<void> {
  const supabase = await createAuthClient()

  // Verify ownership
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("agent_id", agentId)
    .single()

  if (!lead) throw new Error("Lead not found")

  const { error } = await supabase.from("enrichments").insert({
    lead_id: leadId,
    pdl_data: enrichment as unknown as Json,
  })

  if (error) throw new Error("Failed to save enrichment")
}

/**
 * Save quote snapshot — verifies lead ownership before inserting.
 */
export async function saveQuoteSnapshot(
  leadId: string,
  agentId: string,
  snapshot: LeadQuoteSnapshot
): Promise<void> {
  const supabase = await createAuthClient()

  // Verify ownership
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("agent_id", agentId)
    .single()

  if (!lead) throw new Error("Lead not found")

  const { error } = await supabase.from("quotes").insert({
    lead_id: leadId,
    request_data: snapshot.request as unknown as Json,
    response_data: snapshot.response as unknown as Json,
  })

  if (error) throw new Error("Failed to save quote")
}

/**
 * Find a lead by phone number for a given agent.
 * Normalizes both sides to last 10 digits for comparison.
 * Uses service role client when provided (webhook context).
 */
export async function findLeadByPhone(
  agentId: string,
  phoneNumber: string,
  client?: DbClient,
): Promise<Lead | null> {
  const supabase = client ?? (await createAuthClient())
  const searchDigits = phoneLast10(phoneNumber)

  // Fetch all leads for agent with a phone number
  const { data: rows, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agent_id", agentId)
    .not("phone", "is", null)

  if (error || !rows) return null

  const match = rows.find((row) => {
    if (!row.phone) return false
    return phoneLast10(row.phone) === searchDigits
  })

  return match ? rowToLead(match) : null
}
