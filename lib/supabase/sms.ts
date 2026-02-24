import { createAuthClient } from "./auth-server"
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
    createdAt: row.created_at,
  }
}

/* ------------------------------------------------------------------ */
/*  Data access                                                        */
/* ------------------------------------------------------------------ */

export async function saveSmsLog(input: SaveSmsLogInput, client?: DbClient): Promise<SmsLogEntry> {
  const supabase = client ?? await createAuthClient()

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

export async function getSmsLogs(
  leadId: string,
  agentId: string,
): Promise<SmsLogEntry[]> {
  const supabase = await createAuthClient()

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
