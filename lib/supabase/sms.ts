import { createClerkSupabaseClient } from "./clerk-client"
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption/crypto"
import type { Tables } from "@/lib/types/database.generated"
import type { SupabaseClient } from "@supabase/supabase-js"

type SmsLogRow = Tables<"sms_logs">
type DbClient = SupabaseClient

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SmsLogEntry {
  id: string
  leadId: string
  agentId: string
  direction: string
  toNumber: string
  fromNumber: string
  message: string
  status: string | null
  telnyxMessageId: string | null
  isRead: boolean
  createdAt: string | null
}

export interface SaveSmsLogInput {
  leadId: string
  agentId: string
  direction: string
  toNumber: string
  fromNumber: string
  message: string
  status?: string
  telnyxMessageId?: string
}

/* ------------------------------------------------------------------ */
/*  Mapping                                                            */
/* ------------------------------------------------------------------ */

function decryptMessage(value: string): string {
  if (!isEncrypted(value)) return value
  try {
    return decrypt(value)
  } catch {
    return "[encrypted]"
  }
}

function rowToSmsLog(row: SmsLogRow): SmsLogEntry {
  return {
    id: row.id,
    leadId: row.lead_id,
    agentId: row.agent_id,
    direction: row.direction,
    toNumber: row.to_number,
    fromNumber: row.from_number,
    message: decryptMessage(row.message),
    status: row.status,
    telnyxMessageId: row.telnyx_message_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

/* ------------------------------------------------------------------ */
/*  Data access                                                        */
/* ------------------------------------------------------------------ */

export async function saveSmsLog(input: SaveSmsLogInput, client?: DbClient): Promise<SmsLogEntry> {
  const supabase = client ?? await createClerkSupabaseClient()

  const { data: row, error } = await supabase
    .from("sms_logs")
    .insert({
      lead_id: input.leadId,
      agent_id: input.agentId,
      direction: input.direction,
      to_number: input.toNumber,
      from_number: input.fromNumber,
      message: encrypt(input.message),
      status: input.status ?? "sent",
      telnyx_message_id: input.telnyxMessageId,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save SMS log: ${error.message}`)

  return rowToSmsLog(row)
}

export async function markSmsRead(
  leadId: string,
  agentId: string,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  await supabase
    .from("sms_logs")
    .update({ is_read: true })
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .eq("is_read", false)
}

export async function markSmsUnread(
  leadId: string,
  agentId: string,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  // Mark the most recent inbound message as unread
  const { data: rows } = await supabase
    .from("sms_logs")
    .select("id")
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)

  if (rows && rows.length > 0) {
    await supabase
      .from("sms_logs")
      .update({ is_read: false })
      .eq("id", rows[0].id)
  }
}

export async function markAllSmsRead(agentId: string): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  await supabase
    .from("sms_logs")
    .update({ is_read: true })
    .eq("agent_id", agentId)
    .eq("is_read", false)
}

export async function getUnreadCounts(
  agentId: string,
): Promise<Record<string, number>> {
  const supabase = await createClerkSupabaseClient()

  const { data: rows } = await supabase
    .from("sms_logs")
    .select("lead_id")
    .eq("agent_id", agentId)
    .eq("is_read", false)
    .eq("direction", "inbound")

  const counts: Record<string, number> = {}
  for (const row of rows ?? []) {
    counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1
  }
  return counts
}

export async function getSmsLogs(
  leadId: string,
  agentId: string,
): Promise<SmsLogEntry[]> {
  const supabase = await createClerkSupabaseClient()

  // Verify lead ownership
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("agent_id", agentId)
    .single()

  if (!lead) return []

  const { data: rows, error } = await supabase
    .from("sms_logs")
    .select("*")
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to load SMS logs: ${error.message}`)

  return (rows ?? []).map(rowToSmsLog)
}
