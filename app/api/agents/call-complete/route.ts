/* ------------------------------------------------------------------ */
/*  POST /api/agents/call-complete                                     */
/*                                                                     */
/*  Telnyx calls this when a voice call ends. Receives transcript +    */
/*  metadata, runs OpenAI extraction, saves to call_logs with the      */
/*  new extraction columns, and optionally creates a CRM lead.         */
/*                                                                     */
/*  ALWAYS returns 200 — Telnyx retries on 4xx/5xx.                    */
/* ------------------------------------------------------------------ */

import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { createServiceRoleClient, type DbClient } from "@/lib/supabase/server"
import { getAgentByTelnyxAssistantId, incrementAgentStats } from "@/lib/supabase/ai-agents"
import { insertActivityLog } from "@/lib/supabase/activities"
import { encrypt } from "@/lib/encryption/crypto"
import {
  extractFromTranscript,
  type ExtractionAgentConfig,
  type ExtractionResult,
  type CustomCollectField,
} from "@/lib/voice/openai-extraction"
import type { CollectFieldId, PostCallActionId } from "@/lib/types/database"
import type { Json } from "@/lib/types/database.generated"

/* ------------------------------------------------------------------ */
/*  Zod schema for the Telnyx post-call payload                        */
/* ------------------------------------------------------------------ */

const transcriptEntrySchema = z.object({
  role: z.enum(["assistant", "user", "system"]),
  content: z.string(),
  timestamp: z.string().nullish(),
})

const requestSchema = z.object({
  call_id: z.string().min(1),
  transcript: z.string().min(1).max(200_000),
  transcript_data: z.array(transcriptEntrySchema).nullish(),
  duration: z.number().int().min(0).nullish(),
  caller_phone: z.string().nullish(),
  agent_id: z.string().uuid(),
  telnyx_assistant_id: z.string().min(1),
})

type CallCompletePayload = z.infer<typeof requestSchema>

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.webhook, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { status: "error", error: "Invalid JSON" },
      { status: 200 },
    )
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { status: "error", error: "Validation failed", details: parsed.error.flatten() },
      { status: 200 },
    )
  }

  try {
    const result = await processCallComplete(parsed.data)
    return Response.json(result, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[call-complete] Processing failed:", message)
    return Response.json(
      { status: "error", error: "Processing failed" },
      { status: 200 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Core processing logic                                              */
/* ------------------------------------------------------------------ */

interface CallCompleteResult {
  status: "ok" | "error"
  extraction_status: ExtractionResult["status"] | "skipped"
  extracted_fields: string[]
  lead_id?: string | null
}

async function processCallComplete(
  payload: CallCompletePayload,
): Promise<CallCompleteResult> {
  const supabase = createServiceRoleClient()

  // 1. Load agent config
  const agent = await getAgentByTelnyxAssistantId(
    payload.telnyx_assistant_id,
    supabase,
  )

  if (!agent) {
    // Still save the call log even if agent not found
    await saveCallLogWithExtraction(supabase, payload, null, null)
    return {
      status: "ok",
      extraction_status: "skipped",
      extracted_fields: [],
    }
  }

  // Verify the agent_id matches
  if (agent.agent_id !== payload.agent_id) {
    await saveCallLogWithExtraction(supabase, payload, null, null)
    return {
      status: "ok",
      extraction_status: "skipped",
      extracted_fields: [],
    }
  }

  // 2. Run OpenAI extraction
  // custom_collect_fields is a new column (Task 01) not yet in AiAgentRow type
  const rawAgent = agent as unknown as Record<string, unknown>
  const customFields = parseCustomCollectFields(rawAgent.custom_collect_fields)
  const agentConfig: ExtractionAgentConfig = {
    collectFields: (agent.collect_fields ?? ["name", "phone", "reason"]) as CollectFieldId[],
    customCollectFields: customFields.length > 0 ? customFields : undefined,
  }

  let extraction: ExtractionResult
  try {
    extraction = await extractFromTranscript(payload.transcript, agentConfig)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    extraction = {
      status: "failed",
      data: {},
      missingFields: [],
      model: "gpt-4o-mini",
      error: `Extraction threw: ${message}`,
    }
  }

  // 3. Save call log with extraction data
  const callerName = extraction.data.caller_name as string | null ?? null
  await saveCallLogWithExtraction(supabase, payload, extraction, callerName)

  // 4. Increment agent stats (fire-and-forget)
  const durationMinutes = payload.duration
    ? Math.round((payload.duration / 60) * 100) / 100
    : 0
  incrementAgentStats(agent.id, durationMinutes, supabase).catch((err) => {
    console.error("[call-complete] Failed to increment stats:", err instanceof Error ? err.message : String(err))
  })

  // 5. Optionally create/update CRM lead
  const actions = (agent.post_call_actions ?? []) as PostCallActionId[]
  let leadId: string | null = null

  if (actions.includes("save_lead") && extraction.status !== "failed") {
    leadId = await upsertLeadFromExtraction(
      supabase,
      payload,
      extraction,
      agent.agent_id,
    )
  }

  // 6. Log activity (notification)
  if (actions.includes("send_notification")) {
    const targetLeadId = leadId
    if (targetLeadId) {
      insertActivityLog({
        leadId: targetLeadId,
        agentId: agent.agent_id,
        activityType: "call",
        title: "AI agent completed inbound call with extraction",
        details: {
          direction: "inbound",
          handled_by: "ai_agent",
          extraction_status: extraction.status,
          extracted_fields: Object.keys(extraction.data).filter(
            (k) => extraction.data[k] !== null,
          ),
          duration_seconds: payload.duration ?? null,
          has_transcript: true,
        },
      }, supabase).catch((err) => {
        console.error("[call-complete] Failed to log activity:", err instanceof Error ? err.message : String(err))
      })
    }
  }

  return {
    status: "ok",
    extraction_status: extraction.status,
    extracted_fields: Object.keys(extraction.data).filter(
      (k) => extraction.data[k] !== null,
    ),
    lead_id: leadId,
  }
}

/* ------------------------------------------------------------------ */
/*  Save call log with extraction columns                              */
/* ------------------------------------------------------------------ */

async function saveCallLogWithExtraction(
  supabase: DbClient,
  payload: CallCompletePayload,
  extraction: ExtractionResult | null,
  callerName: string | null,
): Promise<void> {
  // We need a lead_id for the FK — find or create a placeholder
  // For now, if no lead exists yet, we skip call_logs insert
  // (the lead creation step will also call saveCallLog)
  // BUT we need to always save call data. Use a direct insert with
  // the new columns that the typed saveCallLog() doesn't know about.

  // Find an existing lead by caller phone
  let leadId: string | null = null
  if (payload.caller_phone) {
    const normalizedPhone = payload.caller_phone.replace(/\D/g, "")
    const phones = [...new Set([payload.caller_phone, normalizedPhone])]

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("agent_id", payload.agent_id)
      .in("phone", phones)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    leadId = existingLead?.id ?? null
  }

  // If no lead found, create a minimal placeholder lead so call_logs FK is satisfied
  if (!leadId) {
    const { firstName, lastName } = parseName(callerName ?? "Unknown Caller")
    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        agent_id: payload.agent_id,
        first_name: firstName,
        last_name: lastName,
        phone: payload.caller_phone ?? null,
        source: "ai_agent",
        status: "new",
      })
      .select("id")
      .single()

    if (leadError || !newLead) {
      console.error("[call-complete] Failed to create placeholder lead:", leadError?.message)
      return
    }
    leadId = newLead.id
  }

  // Encrypt sensitive text fields
  const encryptedTranscript = payload.transcript ? encrypt(payload.transcript) : null

  // Build insert payload — uses raw column names since we need the new columns
  // that aren't in the typed TablesInsert yet
  const insertData: Record<string, unknown> = {
    lead_id: leadId,
    direction: "inbound",
    provider: "telnyx",
    duration_seconds: payload.duration ?? null,
    transcript_text: encryptedTranscript,
    started_at: new Date().toISOString(),
    provider_call_id: payload.call_id,
    // New extraction columns (from Task 01 migration)
    extracted_data: extraction ? (extraction.data as unknown as Json) : null,
    extraction_status: extraction?.status ?? "pending",
    extraction_model: extraction?.model ?? null,
    caller_name: callerName,
    caller_phone: payload.caller_phone ?? null,
    transcript_data: payload.transcript_data
      ? (payload.transcript_data as unknown as Json)
      : null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
  const { error } = await (supabase.from("call_logs") as any).insert(insertData)

  if (error) {
    console.error("[call-complete] Failed to save call log:", error.message)
  }
}

/* ------------------------------------------------------------------ */
/*  Upsert lead from extraction data                                   */
/* ------------------------------------------------------------------ */

async function upsertLeadFromExtraction(
  supabase: DbClient,
  payload: CallCompletePayload,
  extraction: ExtractionResult,
  agentId: string,
): Promise<string | null> {
  const data = extraction.data

  // Check for existing lead by phone
  const phone = data.callback_number as string | null
    ?? payload.caller_phone
    ?? null

  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, "")
    const phones = [...new Set([phone, normalizedPhone])]

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("agent_id", agentId)
      .in("phone", phones)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLead) {
      // Update existing lead with extracted data
      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (data.state) updates.state = data.state
      if (data.email) updates.email = data.email
      if (data.date_of_birth) updates.date_of_birth = data.date_of_birth
      if (data.reason) {
        updates.follow_up_note = `AI call: ${data.reason}`
      }

      await supabase
        .from("leads")
        .update(updates)
        .eq("id", existingLead.id)
        .eq("agent_id", agentId)

      return existingLead.id
    }
  }

  // Create new lead from extraction
  const callerName = data.caller_name as string | null
  const { firstName, lastName } = parseName(callerName ?? "Unknown Caller")

  const { data: newLead, error: leadError } = await supabase
    .from("leads")
    .insert({
      agent_id: agentId,
      first_name: firstName,
      last_name: lastName,
      phone: phone ?? payload.caller_phone ?? null,
      email: (data.email as string | null) ?? null,
      state: (data.state as string | null) ?? null,
      date_of_birth: (data.date_of_birth as string | null) ?? null,
      source: "ai_agent",
      status: "new",
      follow_up_note: data.reason ? `AI call: ${data.reason}` : null,
      notes: buildLeadNotes(data, payload.duration),
    })
    .select("id")
    .single()

  if (leadError || !newLead) {
    console.error("[call-complete] Failed to create lead:", leadError?.message)
    return null
  }

  return newLead.id
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseName(fullName: string): {
  firstName: string
  lastName: string | null
} {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? "Unknown", lastName: null }
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  }
}

function parseCustomCollectFields(raw: unknown): CustomCollectField[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is CustomCollectField =>
      typeof item === "object" &&
      item !== null &&
      typeof item.name === "string" &&
      typeof item.description === "string",
  )
}

function buildLeadNotes(
  data: Record<string, string | null>,
  duration?: number | null,
): string {
  const lines: string[] = []
  lines.push(`AI Agent Call — ${new Date().toLocaleString()}`)

  if (data.reason) lines.push(`Reason: ${data.reason}`)
  if (data.callback_time) lines.push(`Callback: ${data.callback_time}`)
  if (duration) {
    const min = Math.floor(duration / 60)
    const sec = duration % 60
    lines.push(`Duration: ${min}:${String(sec).padStart(2, "0")}`)
  }

  // Include any custom extracted fields
  const standardFields = new Set([
    "caller_name", "callback_number", "reason",
    "callback_time", "email", "date_of_birth", "state",
  ])
  for (const [key, value] of Object.entries(data)) {
    if (!standardFields.has(key) && value !== null) {
      lines.push(`${key}: ${value}`)
    }
  }

  return lines.join("\n")
}
