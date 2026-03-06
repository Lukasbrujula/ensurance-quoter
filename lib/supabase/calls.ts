import { createAuthClient } from "./auth-server"
import type { DbClient } from "./server"
import type { CallLogEntry, CoachingHint } from "@/lib/types/call"
import type { CallDirection, CallProvider, CoachingHintJson, CoachingHintsValue } from "@/lib/types/database"
import type { Tables, TablesInsert, Json } from "@/lib/types/database.generated"
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption/crypto"

type CallLogDbRow = Tables<"call_logs">
type CallLogDbInsert = TablesInsert<"call_logs">

/* ------------------------------------------------------------------ */
/*  Encryption helpers for call log fields                             */
/* ------------------------------------------------------------------ */

const ENCRYPTED_TEXT_FIELDS = ["transcript_text", "ai_summary"] as const

function encryptCallLogFields(insert: CallLogDbInsert): CallLogDbInsert {
  const result = { ...insert }

  // Encrypt text fields
  for (const field of ENCRYPTED_TEXT_FIELDS) {
    const value = result[field]
    if (typeof value === "string" && value) {
      result[field] = encrypt(value)
    }
  }

  // Encrypt coaching_hints: stringify JSONB → encrypt → store as JSON string
  if (result.coaching_hints !== null && result.coaching_hints !== undefined) {
    const json = JSON.stringify(result.coaching_hints)
    result.coaching_hints = encrypt(json) as unknown as Json
  }

  return result
}

function decryptTextField(value: string | null): string | null {
  if (!value) return value
  if (!isEncrypted(value)) return value // backward compat: unencrypted data
  try {
    return decrypt(value)
  } catch {
    return "[encrypted]"
  }
}

function decryptCoachingHints(raw: unknown): unknown {
  if (!raw) return raw
  // If the JSONB value is a string, it's encrypted
  if (typeof raw === "string" && isEncrypted(raw)) {
    try {
      return JSON.parse(decrypt(raw))
    } catch {
      return null
    }
  }
  // Otherwise it's unencrypted legacy data
  return raw
}

/* ------------------------------------------------------------------ */
/*  Row <-> CallLogEntry mapping                                       */
/* ------------------------------------------------------------------ */

function parseCoachingHints(raw: unknown): CoachingHint[] | null {
  if (!raw) return null

  // New format: object with { cards, style_detected, ... }
  if (!Array.isArray(raw) && typeof raw === "object" && "cards" in raw) {
    return null // New structured data — not mapped to old CoachingHint[]
  }

  // Old format: CoachingHintJson[]
  if (Array.isArray(raw)) {
    return raw.map((h: CoachingHintJson) => ({
      id: `${h.type}-${h.timestamp}`,
      type: h.type as CoachingHint["type"],
      text: h.text,
      timestamp: h.timestamp,
      confidence: 1,
      relatedCarriers: h.relatedCarriers,
    }))
  }

  return null
}

function rowToCallLog(row: CallLogDbRow): CallLogEntry {
  return {
    id: row.id,
    leadId: row.lead_id,
    direction: row.direction as CallDirection,
    provider: row.provider as CallProvider,
    providerCallId: row.provider_call_id,
    durationSeconds: row.duration_seconds,
    recordingUrl: row.recording_url,
    transcriptText: decryptTextField(row.transcript_text),
    aiSummary: decryptTextField(row.ai_summary),
    coachingHints: parseCoachingHints(decryptCoachingHints(row.coaching_hints)),
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }
}

/* ------------------------------------------------------------------ */
/*  Data access functions                                              */
/* ------------------------------------------------------------------ */

export interface SaveCallLogInput {
  leadId: string
  direction: CallDirection
  provider: CallProvider
  providerCallId?: string | null
  durationSeconds?: number | null
  recordingUrl?: string | null
  transcriptText?: string | null
  aiSummary?: string | null
  coachingHints?: CoachingHintsValue | null
  startedAt?: string | null
  endedAt?: string | null
}

export async function saveCallLog(input: SaveCallLogInput, client?: DbClient): Promise<CallLogEntry> {
  const supabase = client ?? await createAuthClient()

  const insert: CallLogDbInsert = {
    lead_id: input.leadId,
    direction: input.direction,
    provider: input.provider,
    provider_call_id: input.providerCallId,
    duration_seconds: input.durationSeconds,
    recording_url: input.recordingUrl,
    transcript_text: input.transcriptText,
    ai_summary: input.aiSummary,
    coaching_hints: input.coachingHints as unknown as Json,
    started_at: input.startedAt,
    ended_at: input.endedAt,
  }

  const encrypted = encryptCallLogFields(insert)

  const { data: row, error } = await supabase
    .from("call_logs")
    .insert(encrypted)
    .select()
    .single()

  if (error) throw new Error(`Failed to save call log: ${error.message}`)

  return rowToCallLog(row)
}

export async function getCallLogs(leadId: string, agentId: string): Promise<CallLogEntry[]> {
  const supabase = await createAuthClient()

  // Verify lead ownership before returning call logs
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("agent_id", agentId)
    .single()

  if (!lead) return []

  const { data: rows, error } = await supabase
    .from("call_logs")
    .select("*")
    .eq("lead_id", leadId)
    .order("started_at", { ascending: false })

  if (error) throw new Error(`Failed to load call logs: ${error.message}`)

  return (rows ?? []).map(rowToCallLog)
}

export async function getCallLog(id: string, agentId: string): Promise<CallLogEntry | null> {
  const supabase = await createAuthClient()

  // Join through lead to verify ownership
  const { data: row, error } = await supabase
    .from("call_logs")
    .select("*, leads!inner(agent_id)")
    .eq("id", id)
    .eq("leads.agent_id", agentId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to load call log: ${error.message}`)
  }

  return rowToCallLog(row)
}

/* ------------------------------------------------------------------ */
/*  Agent-scoped call logs (with extraction columns)                    */
/* ------------------------------------------------------------------ */

export interface AgentCallLogRow {
  id: string
  lead_id: string
  direction: string
  duration_seconds: number | null
  started_at: string | null
  caller_name: string | null
  caller_phone: string | null
  extraction_status: string | null
  extracted_data: Record<string, unknown> | null
  provider_call_id: string | null
}

interface GetAgentCallLogsOptions {
  agentId: string
  aiAgentId: string
  limit?: number
  /** ISO timestamp cursor — return rows older than this */
  cursor?: string | null
}

export async function getAgentCallLogs(
  options: GetAgentCallLogsOptions,
): Promise<AgentCallLogRow[]> {
  const { agentId, limit = 50, cursor } = options
  const supabase = await createAuthClient()

  // Get all lead IDs belonging to this user that were created by AI agent calls
  // We join call_logs through leads to ensure ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
  let query = (supabase.from("call_logs") as any)
    .select(
      "id, lead_id, direction, duration_seconds, started_at, caller_name, caller_phone, extraction_status, extracted_data, provider_call_id, leads!inner(agent_id)",
    )
    .eq("leads.agent_id", agentId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (cursor) {
    query = query.lt("started_at", cursor)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load agent call logs: ${error.message}`)
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    lead_id: row.lead_id as string,
    direction: row.direction as string,
    duration_seconds: row.duration_seconds as number | null,
    started_at: row.started_at as string | null,
    caller_name: row.caller_name as string | null,
    caller_phone: row.caller_phone as string | null,
    extraction_status: row.extraction_status as string | null,
    extracted_data: row.extracted_data as Record<string, unknown> | null,
    provider_call_id: row.provider_call_id as string | null,
  }))
}

/* ------------------------------------------------------------------ */
/*  Single agent call detail (with transcript + extraction)             */
/* ------------------------------------------------------------------ */

export interface AgentCallDetailRow extends AgentCallLogRow {
  transcript_text: string | null
  transcript_data: Array<{ role: string; content: string; timestamp?: string | null }> | null
  extraction_model: string | null
  ai_summary: string | null
  ended_at: string | null
}

export async function getAgentCallDetail(
  callId: string,
  agentId: string,
): Promise<AgentCallDetailRow | null> {
  const supabase = await createAuthClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
  const { data, error } = await (supabase.from("call_logs") as any)
    .select(
      "id, lead_id, direction, duration_seconds, started_at, ended_at, caller_name, caller_phone, extraction_status, extracted_data, extraction_model, provider_call_id, transcript_text, transcript_data, ai_summary, leads!inner(agent_id)",
    )
    .eq("id", callId)
    .eq("leads.agent_id", agentId)
    .maybeSingle()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(`Failed to load call detail: ${error.message}`)
  }

  if (!data) return null

  const row = data as Record<string, unknown>

  // Decrypt transcript_text if encrypted
  const rawTranscript = row.transcript_text as string | null
  const transcriptText = rawTranscript ? decryptTextField(rawTranscript) : null

  // Decrypt ai_summary if encrypted
  const rawSummary = row.ai_summary as string | null
  const aiSummary = rawSummary ? decryptTextField(rawSummary) : null

  return {
    id: row.id as string,
    lead_id: row.lead_id as string,
    direction: row.direction as string,
    duration_seconds: row.duration_seconds as number | null,
    started_at: row.started_at as string | null,
    ended_at: row.ended_at as string | null,
    caller_name: row.caller_name as string | null,
    caller_phone: row.caller_phone as string | null,
    extraction_status: row.extraction_status as string | null,
    extracted_data: row.extracted_data as Record<string, unknown> | null,
    extraction_model: row.extraction_model as string | null,
    provider_call_id: row.provider_call_id as string | null,
    transcript_text: transcriptText,
    transcript_data: row.transcript_data as AgentCallDetailRow["transcript_data"],
    ai_summary: aiSummary,
  }
}

export async function getCallCounts(
  leadIds: string[],
  agentId: string,
): Promise<Record<string, number>> {
  if (leadIds.length === 0) return {}

  const supabase = await createAuthClient()

  // Only count calls for leads owned by this agent
  const { data: ownedLeads } = await supabase
    .from("leads")
    .select("id")
    .in("id", leadIds)
    .eq("agent_id", agentId)

  const ownedIds = (ownedLeads ?? []).map((l) => l.id)
  if (ownedIds.length === 0) return {}

  const { data: rows, error } = await supabase
    .from("call_logs")
    .select("lead_id")
    .in("lead_id", ownedIds)

  if (error) throw new Error(`Failed to load call counts: ${error.message}`)

  const counts: Record<string, number> = {}
  for (const row of rows ?? []) {
    counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1
  }
  return counts
}

/* ------------------------------------------------------------------ */
/*  Extraction stats per user (for agent overview cards)               */
/* ------------------------------------------------------------------ */

export interface ExtractionStats {
  /** Total calls with an extraction_status value */
  total: number
  /** Calls where extraction_status is 'completed' or 'success' */
  succeeded: number
}

export async function getExtractionStatsByUser(
  agentId: string,
): Promise<ExtractionStats> {
  const supabase = await createAuthClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
  const { data, error } = await (supabase.from("call_logs") as any)
    .select("extraction_status, leads!inner(agent_id)")
    .eq("leads.agent_id", agentId)
    .not("extraction_status", "is", null)

  if (error) {
    console.error("getExtractionStatsByUser error:", error.message)
    return { total: 0, succeeded: 0 }
  }

  const rows = (data ?? []) as Array<{ extraction_status: string }>
  const total = rows.length
  const succeeded = rows.filter(
    (r) => r.extraction_status === "completed" || r.extraction_status === "success",
  ).length

  return { total, succeeded }
}
