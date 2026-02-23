"use server"

import { z } from "zod"
import {
  getLeads as dbGetLeads,
  getLead as dbGetLead,
  insertLead as dbInsertLead,
  insertLeadsBatch as dbInsertLeadsBatch,
  updateLead as dbUpdateLead,
  deleteLead as dbDeleteLead,
  saveEnrichment as dbSaveEnrichment,
  saveQuoteSnapshot as dbSaveQuoteSnapshot,
} from "@/lib/supabase/leads"
import { requireUser } from "@/lib/supabase/auth-server"
import type { Lead, LeadQuoteSnapshot } from "@/lib/types/lead"
import type { EnrichmentResult } from "@/lib/types/ai"

/* ------------------------------------------------------------------ */
/*  Server Actions — validated wrappers around Supabase data layer     */
/*  Called from client components / Zustand store actions               */
/*                                                                      */
/*  All actions use requireUser() to get the authenticated user's ID.  */
/*  Ownership is enforced at the data layer (agent_id filter).         */
/*  Error messages are sanitized — never forward raw DB errors.        */
/* ------------------------------------------------------------------ */

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/* ── Validation schemas ──────────────────────────────────────────── */

const uuidSchema = z.string().uuid()

const leadFieldsSchema = z.object({
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  state: z.string().max(30).nullable().optional(),
  age: z.number().int().min(0).max(150).nullable().optional(),
  gender: z.enum(["Male", "Female"]).nullable().optional(),
  tobaccoStatus: z.enum(["non-smoker", "smoker"]).nullable().optional(),
  medicalConditions: z.array(z.string().max(100)).max(50).optional(),
  duiHistory: z.boolean().optional(),
  yearsSinceLastDui: z.number().int().min(0).max(100).nullable().optional(),
  coverageAmount: z.number().min(0).max(10_000_000).nullable().optional(),
  termLength: z.number().int().min(1).max(40).nullable().optional(),
  source: z.enum(["csv", "ringba", "manual", "api"]).optional(),
  rawCsvData: z.record(z.string(), z.unknown()).nullable().optional(),
})

/* ── Actions ─────────────────────────────────────────────────────── */

export async function fetchLeads(): Promise<ActionResult<Lead[]>> {
  try {
    const user = await requireUser()
    const leads = await dbGetLeads(user.id)
    return { success: true, data: leads }
  } catch (error) {
    console.error("fetchLeads error:", error)
    return { success: false, error: "Failed to fetch leads" }
  }
}

export async function fetchLead(
  id: string
): Promise<ActionResult<Lead | null>> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) {
    return { success: false, error: "Invalid lead ID" }
  }

  try {
    const user = await requireUser()
    const lead = await dbGetLead(parsed.data, user.id)
    return { success: true, data: lead }
  } catch (error) {
    console.error("fetchLead error:", error)
    return { success: false, error: "Failed to fetch lead" }
  }
}

export async function createLead(
  input: Partial<Lead>
): Promise<ActionResult<Lead>> {
  const parsed = leadFieldsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Invalid lead data" }
  }

  try {
    const user = await requireUser()
    const created = await dbInsertLead({ ...parsed.data, agentId: user.id })
    return { success: true, data: created }
  } catch (error) {
    console.error("createLead error:", error)
    return { success: false, error: "Failed to create lead" }
  }
}

export async function updateLeadFields(
  id: string,
  fields: Partial<Lead>
): Promise<ActionResult<Lead>> {
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) {
    return { success: false, error: "Invalid lead ID" }
  }

  const parsedFields = leadFieldsSchema.safeParse(fields)
  if (!parsedFields.success) {
    return { success: false, error: "Invalid field data" }
  }

  try {
    const user = await requireUser()
    const updated = await dbUpdateLead(parsedId.data, user.id, parsedFields.data)
    return { success: true, data: updated }
  } catch (error) {
    console.error("updateLeadFields error:", error)
    return { success: false, error: "Failed to update lead" }
  }
}

export async function removeLeadAction(
  id: string
): Promise<ActionResult<void>> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) {
    return { success: false, error: "Invalid lead ID" }
  }

  try {
    const user = await requireUser()
    await dbDeleteLead(parsed.data, user.id)
    return { success: true }
  } catch (error) {
    console.error("removeLeadAction error:", error)
    return { success: false, error: "Failed to delete lead" }
  }
}

export async function persistEnrichment(
  leadId: string,
  enrichment: EnrichmentResult
): Promise<ActionResult<void>> {
  const parsed = uuidSchema.safeParse(leadId)
  if (!parsed.success) {
    return { success: false, error: "Invalid lead ID" }
  }

  try {
    const user = await requireUser()
    await dbSaveEnrichment(parsed.data, user.id, enrichment)
    return { success: true }
  } catch (error) {
    console.error("persistEnrichment error:", error)
    return { success: false, error: "Failed to save enrichment" }
  }
}

export async function persistQuoteSnapshot(
  leadId: string,
  snapshot: LeadQuoteSnapshot
): Promise<ActionResult<void>> {
  const parsed = uuidSchema.safeParse(leadId)
  if (!parsed.success) {
    return { success: false, error: "Invalid lead ID" }
  }

  try {
    const user = await requireUser()
    await dbSaveQuoteSnapshot(parsed.data, user.id, snapshot)
    return { success: true }
  } catch (error) {
    console.error("persistQuoteSnapshot error:", error)
    return { success: false, error: "Failed to save quote" }
  }
}

export async function createLeadsBatch(
  leads: Array<Partial<Lead>>
): Promise<ActionResult<Lead[]>> {
  const batchSchema = z.array(leadFieldsSchema).min(1).max(1000)
  const parsed = batchSchema.safeParse(leads)
  if (!parsed.success) {
    return { success: false, error: "Invalid batch data" }
  }

  try {
    const user = await requireUser()
    const withAgent = parsed.data.map((lead) => ({
      ...lead,
      agentId: user.id,
    }))
    const created = await dbInsertLeadsBatch(withAgent)
    return { success: true, data: created }
  } catch (error) {
    console.error("createLeadsBatch error:", error)
    return { success: false, error: "Failed to create leads batch" }
  }
}
