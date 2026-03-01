/* ------------------------------------------------------------------ */
/*  AI Agent Lead Processor                                             */
/*  Converts webhook data into CRM leads with call logs + activity.     */
/*  Uses service role client (called from webhook, no user session).     */
/*                                                                      */
/*  T10.11: Respects agent.post_call_actions:                           */
/*  - save_lead → create/update CRM lead                                */
/*  - book_calendar → create Google Calendar event                      */
/*  - send_notification → insert activity log (bell notification)       */
/* ------------------------------------------------------------------ */

import { createServiceRoleClient } from "@/lib/supabase/server"
import { insertActivityLog } from "@/lib/supabase/activities"
import { saveCallLog } from "@/lib/supabase/calls"
import { createCalendarEvent } from "@/lib/google/calendar-service"
import { getAgent } from "@/lib/supabase/ai-agents"
import type { AIAgentWebhookPayload } from "@/app/api/ai-agent/webhook/route"
import type { PostCallActionId } from "@/lib/types/database"

interface ProcessAICallInput {
  agentId: string
  aiAgentId?: string | null
  callRecordId: string
  data: AIAgentWebhookPayload
  transcript?: string | null
  conversationDuration?: number | null
}

interface ProcessAICallResult {
  leadId: string | null
  action: "created" | "updated" | "skipped"
}

const DEFAULT_POST_CALL_ACTIONS: PostCallActionId[] = [
  "save_lead",
  "book_calendar",
  "send_notification",
]

/**
 * Process an AI agent call based on the agent's post_call_actions config.
 * - Fetches agent config to determine which actions to perform
 * - Deduplicates by phone number (updates existing lead if found)
 * - Creates call log entry
 * - Creates activity log entry (notification)
 * - Syncs to Google Calendar
 * - Links the ai_agent_calls record to the lead
 */
export async function processAICallToLead(
  input: ProcessAICallInput,
): Promise<ProcessAICallResult> {
  const {
    agentId,
    aiAgentId,
    callRecordId,
    data,
    transcript,
    conversationDuration,
  } = input
  const supabase = createServiceRoleClient()

  // Fetch agent config to get post_call_actions
  let actions: PostCallActionId[] = DEFAULT_POST_CALL_ACTIONS
  if (aiAgentId) {
    try {
      const agent = await getAgent(agentId, aiAgentId, supabase)
      if (agent?.post_call_actions) {
        actions = agent.post_call_actions as PostCallActionId[]
      }
    } catch (err) {
      console.error("[AI Lead] Failed to fetch agent config, using defaults:", err)
    }
  }

  const shouldSaveLead = actions.includes("save_lead")
  const shouldBookCalendar = actions.includes("book_calendar")
  const shouldNotify = actions.includes("send_notification")

  // If save_lead is disabled, mark call as processed and skip lead creation
  if (!shouldSaveLead) {
    await supabase
      .from("ai_agent_calls")
      .update({ processed: true })
      .eq("id", callRecordId)

    return { leadId: null, action: "skipped" }
  }

  // Check for existing lead by phone number
  const existingLead = data.callback_number
    ? await findLeadByPhone(agentId, data.callback_number)
    : null

  let leadId: string
  let action: "created" | "updated"

  if (existingLead) {
    // Update existing lead — append to notes, do not overwrite
    leadId = existingLead.id
    action = "updated"

    const appendNote = buildAppendNote(data)
    const existingNotes = existingLead.notes || ""
    const updatedNotes = existingNotes
      ? `${existingNotes}\n\n---\n${appendNote}`
      : appendNote

    await supabase
      .from("leads")
      .update({
        notes: updatedNotes,
        follow_up_date: parseCallbackPreference(data.callback_time),
        follow_up_note: `Callback requested - ${data.reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("agent_id", agentId)
  } else {
    // Create new lead
    action = "created"

    // Parse name into first/last
    const { firstName, lastName } = parseName(data.caller_name)

    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        agent_id: agentId,
        first_name: firstName,
        last_name: lastName,
        phone: data.callback_number ?? null,
        state: data.state ?? null,
        source: "ai_agent",
        status: "new",
        notes: buildLeadNotes(data),
        follow_up_date: parseCallbackPreference(data.callback_time),
        follow_up_note: `Callback requested - ${data.reason}`,
      })
      .select("id")
      .single()

    if (leadError || !newLead) {
      throw new Error(`Failed to create lead: ${leadError?.message}`)
    }

    leadId = newLead.id

    // Log lead creation activity
    if (shouldNotify) {
      await insertActivityLog({
        leadId,
        agentId,
        activityType: "lead_created",
        title: "Lead created by AI voice agent",
        details: { source: "ai_agent" },
      }, supabase).catch((error) => {
        console.error("[AI Lead] Failed to log lead creation:", error instanceof Error ? error.message : String(error))
      })
    }
  }

  // Create call log entry (always — this is audit data, not a toggleable action)
  const aiSummary = buildCallSummary(data)
  await saveCallLog({
    leadId,
    direction: "inbound",
    provider: "telnyx",
    durationSeconds: conversationDuration ?? null,
    transcriptText: transcript ?? null,
    aiSummary,
    startedAt: new Date().toISOString(),
  }, supabase).catch((error) => {
    console.error("[AI Lead] Failed to save call log:", error instanceof Error ? error.message : String(error))
  })

  // Log call activity (notification)
  if (shouldNotify) {
    await insertActivityLog({
      leadId,
      agentId,
      activityType: "call",
      title: "AI agent handled inbound call",
      details: {
        direction: "inbound",
        handled_by: "ai_agent",
        caller_name: data.caller_name,
        reason: data.reason,
        urgency: data.urgency || "low",
        duration_seconds: conversationDuration ?? null,
        has_transcript: !!transcript,
      },
    }, supabase).catch((error) => {
      console.error("[AI Lead] Failed to log call activity:", error instanceof Error ? error.message : String(error))
    })
  }

  // Link the ai_agent_calls record to the lead
  await supabase
    .from("ai_agent_calls")
    .update({ lead_id: leadId, processed: true })
    .eq("id", callRecordId)

  // Sync follow-up to Google Calendar (fire-and-forget)
  if (shouldBookCalendar && data.callback_time) {
    const followUpDate = parseCallbackPreference(data.callback_time)
    const callerName = data.caller_name || "Unknown caller"
    createCalendarEvent(agentId, {
      title: `AI Callback: ${callerName}`,
      description: `Booked by AI voice agent. Reason: ${data.reason || "Not specified"}`,
      startTime: followUpDate,
      leadId,
    }).then((googleEventId) => {
      if (googleEventId) {
        supabase
          .from("leads")
          .update({ google_event_id: googleEventId })
          .eq("id", leadId)
          .eq("agent_id", agentId)
          .then(({ error: updateErr }) => {
            if (updateErr) {
              console.error("[Google Calendar] Failed to link event to lead:", updateErr)
            }
          })
      }
    }).catch((err) => {
      console.error("[Google Calendar] Failed to create AI callback event:", err)
    })
  }

  return { leadId, action }
}

/* ------------------------------------------------------------------ */
/*  Helper functions                                                    */
/* ------------------------------------------------------------------ */

async function findLeadByPhone(
  agentId: string,
  phone: string,
): Promise<{ id: string; notes: string | null } | null> {
  const supabase = createServiceRoleClient()

  // Normalize phone for comparison (strip non-digits)
  const normalizedPhone = phone.replace(/\D/g, "")

  // Use .in() instead of .or() to avoid PostgREST filter injection
  const phones = [...new Set([phone, normalizedPhone])]

  const { data, error } = await supabase
    .from("leads")
    .select("id, notes")
    .eq("agent_id", agentId)
    .in("phone", phones)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null
  return data
}

function parseName(fullName: string): {
  firstName: string
  lastName: string | null
} {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: null }
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  }
}

function buildLeadNotes(data: AIAgentWebhookPayload): string {
  const lines: string[] = []

  lines.push(`AI Agent Call - ${new Date().toLocaleString()}`)
  lines.push(`Reason: ${data.reason}`)

  if (data.callback_time) {
    lines.push(`Callback preference: ${data.callback_time}`)
  }
  if (data.urgency === "high") {
    lines.push("URGENT - caller indicated time-sensitive need")
  }
  if (data.age_range) {
    lines.push(`Age range: ${data.age_range}`)
  }
  if (data.notes) {
    lines.push(`Additional notes: ${data.notes}`)
  }

  return lines.join("\n")
}

function buildAppendNote(data: AIAgentWebhookPayload): string {
  const lines: string[] = []

  lines.push(`Additional AI call on ${new Date().toLocaleString()}`)
  lines.push(`Reason: ${data.reason}`)

  if (data.callback_time) {
    lines.push(`Callback preference: ${data.callback_time}`)
  }
  if (data.urgency === "high") {
    lines.push("URGENT")
  }
  if (data.notes) {
    lines.push(`Notes: ${data.notes}`)
  }

  return lines.join("\n")
}

function buildCallSummary(data: AIAgentWebhookPayload): string {
  const parts = [
    `AI agent collected: ${data.caller_name}`,
    `calling about ${data.reason}`,
  ]

  if (data.callback_time) {
    parts.push(`Callback requested: ${data.callback_time}`)
  } else {
    parts.push("Callback requested: ASAP")
  }

  if (data.urgency === "high") {
    parts.push("(URGENT)")
  }

  return parts.join(". ") + "."
}

/**
 * Parse natural language callback preference into a date.
 * Falls back to 1 hour from now if unparseable.
 */
function parseCallbackPreference(preference?: string): string {
  const now = new Date()
  const fallback = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

  if (!preference) return fallback.toISOString()

  const lower = preference.toLowerCase()

  if (lower.includes("tomorrow morning") || lower.includes("tomorrow am")) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.toISOString()
  }

  if (lower.includes("tomorrow afternoon") || lower.includes("tomorrow pm")) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(14, 0, 0, 0)
    return tomorrow.toISOString()
  }

  if (lower.includes("tomorrow")) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    return tomorrow.toISOString()
  }

  if (lower.includes("today") || lower.includes("later today")) {
    return fallback.toISOString()
  }

  if (lower.includes("morning")) {
    const morning = new Date(now)
    if (morning.getHours() >= 12) {
      morning.setDate(morning.getDate() + 1)
    }
    morning.setHours(9, 0, 0, 0)
    return morning.toISOString()
  }

  if (lower.includes("afternoon")) {
    const afternoon = new Date(now)
    if (afternoon.getHours() >= 17) {
      afternoon.setDate(afternoon.getDate() + 1)
    }
    afternoon.setHours(14, 0, 0, 0)
    return afternoon.toISOString()
  }

  if (
    lower.includes("asap") ||
    lower.includes("as soon as") ||
    lower.includes("right away")
  ) {
    // 30 minutes from now for urgent
    return new Date(now.getTime() + 30 * 60 * 1000).toISOString()
  }

  if (lower.includes("anytime") || lower.includes("whenever")) {
    return fallback.toISOString()
  }

  // Default: 1 hour from now
  return fallback.toISOString()
}
