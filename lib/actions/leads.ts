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
/*  The service role key bypasses RLS at the data layer.               */
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
    const message =
      error instanceof Error ? error.message : "Failed to fetch leads"
    return { success: false, error: message }
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
    await requireUser()
    const lead = await dbGetLead(parsed.data)
    return { success: true, data: lead }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch lead"
    return { success: false, error: message }
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
    const message =
      error instanceof Error ? error.message : "Failed to create lead"
    return { success: false, error: message }
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
    await requireUser()
    const updated = await dbUpdateLead(parsedId.data, parsedFields.data)
    return { success: true, data: updated }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update lead"
    return { success: false, error: message }
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
    await requireUser()
    await dbDeleteLead(parsed.data)
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete lead"
    return { success: false, error: message }
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
    await requireUser()
    await dbSaveEnrichment(parsed.data, enrichment)
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save enrichment"
    return { success: false, error: message }
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
    await requireUser()
    await dbSaveQuoteSnapshot(parsed.data, snapshot)
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save quote"
    return { success: false, error: message }
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
    const message =
      error instanceof Error ? error.message : "Failed to create leads batch"
    return { success: false, error: message }
  }
}
