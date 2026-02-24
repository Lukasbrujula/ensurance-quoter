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
import { logActivity } from "@/lib/actions/log-activity"
import { runPreScreen } from "@/lib/engine/pre-screen"
import type { Lead, LeadQuoteSnapshot } from "@/lib/types/lead"
import type { EnrichmentResult } from "@/lib/types/ai"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar-service"

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
  source: z.enum(["csv", "ringba", "manual", "api", "ai_agent"]).optional(),
  rawCsvData: z.record(z.string(), z.unknown()).nullable().optional(),
  // Phase 6: personal/contact
  dateOfBirth: z.string().date().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/).nullable().optional(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "domestic_partner"]).nullable().optional(),
  // Phase 6: financial/professional
  occupation: z.string().max(200).nullable().optional(),
  incomeRange: z.enum(["under_25k", "25k_50k", "50k_75k", "75k_100k", "100k_150k", "150k_250k", "over_250k"]).nullable().optional(),
  dependents: z.number().int().min(0).max(20).nullable().optional(),
  existingCoverage: z.string().max(500).nullable().optional(),
  // Phase 6: CRM workflow
  status: z.enum(["new", "contacted", "quoted", "applied", "issued", "dead"]).optional(),
  statusUpdatedAt: z.string().datetime().nullable().optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  followUpNote: z.string().max(1000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  // Google Calendar (Phase 10)
  googleEventId: z.string().max(500).nullable().optional(),
})

/* ── Actions ─────────────────────────────────────────────────────── */

export async function fetchLeads(): Promise<ActionResult<Lead[]>> {
  try {
    const user = await requireUser()
    const leads = await dbGetLeads(user.id)
    return { success: true, data: leads }
  } catch (error) {
    console.error("fetchLeads error:", error instanceof Error ? error.message : "Unknown error")
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
    console.error("fetchLead error:", error instanceof Error ? error.message : "Unknown error")
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

    logActivity({
      leadId: created.id,
      agentId: user.id,
      activityType: "lead_created",
      title: "Lead created",
      details: { source: created.source },
    })

    // Auto pre-screen if lead has enough data
    if (created.state || created.age) {
      const preScreen = runPreScreen({
        leadId: created.id,
        state: created.state,
        age: created.age,
        gender: created.gender,
        coverageAmount: created.coverageAmount,
        termLength: created.termLength,
        tobaccoStatus: created.tobaccoStatus,
        medicalConditions: created.medicalConditions,
        duiHistory: created.duiHistory,
        yearsSinceLastDui: created.yearsSinceLastDui,
      })
      void dbUpdateLead(created.id, user.id, { preScreen }).catch(() => {})
    }

    return { success: true, data: created }
  } catch (error) {
    console.error("createLead error:", error instanceof Error ? error.message : "Unknown error")
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

    // Fetch existing lead for calendar sync comparison
    const existingLead = parsedFields.data.followUpDate !== undefined
      ? await dbGetLead(parsedId.data, user.id)
      : null

    const updated = await dbUpdateLead(parsedId.data, user.id, parsedFields.data)

    const changedKeys = Object.keys(parsedFields.data)

    // Log status change specifically
    if (parsedFields.data.status) {
      logActivity({
        leadId: parsedId.data,
        agentId: user.id,
        activityType: "status_change",
        title: `Status changed to ${parsedFields.data.status}`,
        details: { to: parsedFields.data.status },
      })
    }

    // Log follow-up scheduling
    if (parsedFields.data.followUpDate) {
      logActivity({
        leadId: parsedId.data,
        agentId: user.id,
        activityType: "follow_up",
        title: "Follow-up scheduled",
        details: {
          date: parsedFields.data.followUpDate,
          note: parsedFields.data.followUpNote ?? null,
        },
      })
    }

    // Log general field updates (exclude status/follow-up already logged)
    const dataFields = changedKeys.filter(
      (k) => !["status", "statusUpdatedAt", "followUpDate", "followUpNote"].includes(k),
    )
    if (dataFields.length > 0) {
      logActivity({
        leadId: parsedId.data,
        agentId: user.id,
        activityType: "lead_updated",
        title: "Lead details updated",
        details: { fields_changed: dataFields },
      })
    }

    // Auto re-screen if screening-relevant fields changed
    const screenFields = ["state", "age", "gender", "coverageAmount", "termLength", "tobaccoStatus", "medicalConditions", "medications", "duiHistory", "yearsSinceLastDui"]
    const hasScreeningChange = changedKeys.some((k) => screenFields.includes(k))
    if (hasScreeningChange && (updated.state || updated.age)) {
      const preScreen = runPreScreen({
        leadId: parsedId.data,
        state: updated.state,
        age: updated.age,
        gender: updated.gender,
        coverageAmount: updated.coverageAmount,
        termLength: updated.termLength,
        tobaccoStatus: updated.tobaccoStatus,
        medicalConditions: updated.medicalConditions,
        duiHistory: updated.duiHistory,
        yearsSinceLastDui: updated.yearsSinceLastDui,
      })
      void dbUpdateLead(parsedId.data, user.id, { preScreen }).catch(() => {})
    }

    // Google Calendar sync (fire-and-forget)
    if (parsedFields.data.followUpDate !== undefined && existingLead) {
      const newDate = parsedFields.data.followUpDate
      const oldDate = existingLead.followUpDate
      const existingEventId = existingLead.googleEventId
      const leadName = [updated.firstName, updated.lastName].filter(Boolean).join(" ") || "Unknown"

      if (newDate && newDate !== oldDate) {
        // Follow-up SET or CHANGED
        if (existingEventId) {
          // Update existing Google event
          updateCalendarEvent(user.id, existingEventId, {
            startTime: newDate,
          }).catch((err) => {
            console.error("[Google Calendar] Failed to update event:", err)
          })
        } else {
          // Create new Google event
          createCalendarEvent(user.id, {
            title: `Follow-up: ${leadName}`,
            description: parsedFields.data.followUpNote ?? undefined,
            startTime: newDate,
            leadId: parsedId.data,
          }).then((eventId) => {
            if (eventId) {
              dbUpdateLead(parsedId.data, user.id, { googleEventId: eventId }).catch((err) => {
                console.error("[Google Calendar] Failed to link event:", err)
              })
            }
          }).catch((err) => {
            console.error("[Google Calendar] Failed to create event:", err)
          })
        }
      } else if (!newDate && existingEventId) {
        // Follow-up CLEARED — clear event link (already in this update) + delete Google event
        dbUpdateLead(parsedId.data, user.id, { googleEventId: null }).catch((err) => {
          console.error("[Google Calendar] Failed to clear event link:", err)
        })
        deleteCalendarEvent(user.id, existingEventId).catch((err) => {
          console.error("[Google Calendar] Failed to delete event:", err)
        })
      }
    }

    return { success: true, data: updated }
  } catch (error) {
    console.error("updateLeadFields error:", error instanceof Error ? error.message : "Unknown error")
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
    console.error("removeLeadAction error:", error instanceof Error ? error.message : "Unknown error")
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

    logActivity({
      leadId: parsed.data,
      agentId: user.id,
      activityType: "enrichment",
      title: "Lead enriched via People Data Labs",
      details: {
        fields_updated: Object.keys(enrichment).filter(
          (k) => enrichment[k as keyof EnrichmentResult] != null,
        ).slice(0, 20),
      },
    })

    return { success: true }
  } catch (error) {
    console.error("persistEnrichment error:", error instanceof Error ? error.message : "Unknown error")
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

    const eligibleCount = snapshot.response?.eligibleCount ?? 0
    const topQuote = snapshot.response?.quotes?.[0]
    const topCarrier = topQuote?.carrier?.name ?? null
    const coverage = snapshot.request?.coverageAmount
    const term = snapshot.request?.termLength

    logActivity({
      leadId: parsed.data,
      agentId: user.id,
      activityType: "quote",
      title: `Quote generated — ${eligibleCount} carrier${eligibleCount !== 1 ? "s" : ""} eligible`,
      details: {
        carrier_count: eligibleCount,
        top_carrier: topCarrier,
        coverage: coverage ? `$${(coverage / 1000).toFixed(0)}K` : null,
        term: term ? `${term}Y` : null,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("persistQuoteSnapshot error:", error instanceof Error ? error.message : "Unknown error")
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

    for (const lead of created) {
      logActivity({
        leadId: lead.id,
        agentId: user.id,
        activityType: "lead_created",
        title: "Lead created",
        details: { source: "csv" },
      })
    }

    return { success: true, data: created }
  } catch (error) {
    console.error("createLeadsBatch error:", error instanceof Error ? error.message : "Unknown error")
    return { success: false, error: "Failed to create leads batch" }
  }
}
