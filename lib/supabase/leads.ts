import { createServerClient } from "./server"
import type { Lead, LeadQuoteSnapshot } from "@/lib/types/lead"
import type { EnrichmentResult } from "@/lib/types/ai"
import type { Gender, TobaccoStatus } from "@/lib/types/quote"
import type { Tables, TablesInsert, TablesUpdate, Json } from "@/lib/types/database.generated"
import type { LeadSource } from "@/lib/types/database"

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
    medicalConditions: row.medical_conditions ?? [],
    duiHistory: row.dui_history ?? false,
    yearsSinceLastDui: row.years_since_last_dui,
    coverageAmount: row.coverage_amount,
    termLength: row.term_length,
    source: row.source as LeadSource,
    rawCsvData: row.raw_csv_data as Record<string, unknown> | null,
    enrichment,
    quoteHistory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function leadToInsert(lead: Partial<Lead> & { agentId: string }): LeadDbInsert {
  return {
    id: lead.id,
    agent_id: lead.agentId,
    first_name: lead.firstName,
    last_name: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    state: lead.state,
    age: lead.age,
    gender: lead.gender,
    tobacco_status: lead.tobaccoStatus,
    medical_conditions: lead.medicalConditions ?? [],
    dui_history: lead.duiHistory ?? false,
    years_since_last_dui: lead.yearsSinceLastDui,
    coverage_amount: lead.coverageAmount,
    term_length: lead.termLength,
    source: lead.source ?? "manual",
    raw_csv_data: lead.rawCsvData as Json,
  }
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
  if (fields.medicalConditions !== undefined) update.medical_conditions = fields.medicalConditions
  if (fields.duiHistory !== undefined) update.dui_history = fields.duiHistory
  if (fields.yearsSinceLastDui !== undefined) update.years_since_last_dui = fields.yearsSinceLastDui
  if (fields.coverageAmount !== undefined) update.coverage_amount = fields.coverageAmount
  if (fields.termLength !== undefined) update.term_length = fields.termLength
  if (fields.source !== undefined) update.source = fields.source
  if (fields.rawCsvData !== undefined) update.raw_csv_data = fields.rawCsvData as Json
  return update
}

/* ------------------------------------------------------------------ */
/*  Data access functions                                              */
/*  All single-record operations filter by agent_id for ownership.    */
/* ------------------------------------------------------------------ */

export async function getLeads(agentId: string): Promise<Lead[]> {
  const supabase = createServerClient()

  const { data: rows, error } = await supabase
    .from("leads")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) throw new Error("Failed to load leads")

  return (rows ?? []).map((row) => rowToLead(row))
}

export async function getLead(id: string, agentId: string): Promise<Lead | null> {
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()
  const inserts = leads.map(leadToInsert)

  const { data: rows, error } = await supabase
    .from("leads")
    .insert(inserts)
    .select()

  if (error) throw new Error("Failed to batch insert leads")

  return (rows ?? []).map((row) => rowToLead(row))
}

export async function updateLead(
  id: string,
  agentId: string,
  fields: Partial<Lead>
): Promise<Lead> {
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
  const supabase = createServerClient()

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
