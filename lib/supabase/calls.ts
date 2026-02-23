import { createAuthClient } from "./auth-server"
import type { DbClient } from "./server"
import type { CallLogEntry, CoachingHint } from "@/lib/types/call"
import type { CallDirection, CallProvider, CoachingHintJson, CoachingHintsValue } from "@/lib/types/database"
import type { Tables, TablesInsert, Json } from "@/lib/types/database.generated"

type CallLogDbRow = Tables<"call_logs">
type CallLogDbInsert = TablesInsert<"call_logs">

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
    transcriptText: row.transcript_text,
    aiSummary: row.ai_summary,
    coachingHints: parseCoachingHints(row.coaching_hints),
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

  const { data: row, error } = await supabase
    .from("call_logs")
    .insert(insert)
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
