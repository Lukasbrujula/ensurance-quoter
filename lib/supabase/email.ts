/* ------------------------------------------------------------------ */
/*  Email Logs — Data Layer                                            */
/*  CRUD for email_logs table with encryption (mirrors sms.ts).        */
/* ------------------------------------------------------------------ */

import { createClerkSupabaseClient } from "./clerk-client"
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption/crypto"
import type { Tables } from "@/lib/types/database.generated"

type EmailLogRow = Tables<"email_logs">

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface EmailLogEntry {
  id: string
  agentId: string
  leadId: string | null
  provider: string
  gmailMessageId: string | null
  gmailThreadId: string | null
  direction: string
  fromAddress: string
  toAddress: string
  ccAddress: string | null
  subject: string | null
  bodySnippet: string | null
  bodyHtml: string | null
  hasAttachments: boolean
  isRead: boolean
  createdAt: string
  syncedAt: string
}

export interface SaveEmailLogInput {
  agentId: string
  leadId: string | null
  provider?: string
  gmailMessageId?: string
  gmailThreadId?: string
  direction: "inbound" | "outbound"
  fromAddress: string
  toAddress: string
  ccAddress?: string | null
  subject?: string
  bodySnippet?: string
  bodyHtml?: string
  hasAttachments?: boolean
  isRead?: boolean
}

/* ------------------------------------------------------------------ */
/*  Encryption helpers                                                 */
/* ------------------------------------------------------------------ */

const ENCRYPTED_FIELDS = ["subject", "body_snippet", "body_html"] as const

function decryptField(value: string | null): string | null {
  if (!value) return null
  if (!isEncrypted(value)) return value
  try {
    return decrypt(value)
  } catch {
    return "[encrypted]"
  }
}

function rowToEmailLog(row: EmailLogRow): EmailLogEntry {
  return {
    id: row.id,
    agentId: row.agent_id,
    leadId: row.lead_id,
    provider: row.provider,
    gmailMessageId: row.gmail_message_id,
    gmailThreadId: row.gmail_thread_id,
    direction: row.direction,
    fromAddress: row.from_address,
    toAddress: row.to_address,
    ccAddress: row.cc_address,
    subject: decryptField(row.subject),
    bodySnippet: decryptField(row.body_snippet),
    bodyHtml: decryptField(row.body_html),
    hasAttachments: row.has_attachments,
    isRead: row.is_read,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
  }
}

/* ------------------------------------------------------------------ */
/*  Data access                                                        */
/* ------------------------------------------------------------------ */

/** Save an email log entry with encrypted sensitive fields. */
export async function saveEmailLog(input: SaveEmailLogInput): Promise<EmailLogEntry> {
  const supabase = await createClerkSupabaseClient()

  const { data: row, error } = await supabase
    .from("email_logs")
    .insert({
      agent_id: input.agentId,
      lead_id: input.leadId,
      provider: input.provider ?? "gmail",
      gmail_message_id: input.gmailMessageId ?? null,
      gmail_thread_id: input.gmailThreadId ?? null,
      direction: input.direction,
      from_address: input.fromAddress,
      to_address: input.toAddress,
      cc_address: input.ccAddress ?? null,
      subject: input.subject ? encrypt(input.subject) : null,
      body_snippet: input.bodySnippet ? encrypt(input.bodySnippet) : null,
      body_html: input.bodyHtml ? encrypt(input.bodyHtml) : null,
      has_attachments: input.hasAttachments ?? false,
      is_read: input.isRead ?? (input.direction === "outbound"),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save email log: ${error.message}`)

  return rowToEmailLog(row)
}

/** Get email logs for a specific lead. */
export async function getEmailLogs(
  leadId: string,
  agentId: string,
): Promise<EmailLogEntry[]> {
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
    .from("email_logs")
    .select("*")
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to load email logs: ${error.message}`)

  return (rows ?? []).map(rowToEmailLog)
}

/** Mark all emails for a lead as read. */
export async function markEmailsRead(
  leadId: string,
  agentId: string,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  await supabase
    .from("email_logs")
    .update({ is_read: true })
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .eq("is_read", false)
}

/** Mark all emails as read for the agent. */
export async function markAllEmailsRead(agentId: string): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  await supabase
    .from("email_logs")
    .update({ is_read: true })
    .eq("agent_id", agentId)
    .eq("is_read", false)
}

/** Get unread email counts per lead. */
export async function getEmailUnreadCounts(
  agentId: string,
): Promise<Record<string, number>> {
  const supabase = await createClerkSupabaseClient()

  const { data: rows } = await supabase
    .from("email_logs")
    .select("lead_id")
    .eq("agent_id", agentId)
    .eq("is_read", false)
    .eq("direction", "inbound")

  const counts: Record<string, number> = {}
  for (const row of rows ?? []) {
    if (row.lead_id) {
      counts[row.lead_id] = (counts[row.lead_id] ?? 0) + 1
    }
  }
  return counts
}

/** Check if an email with a given Gmail message ID already exists. */
export async function emailExistsByGmailId(
  agentId: string,
  gmailMessageId: string,
): Promise<boolean> {
  const supabase = await createClerkSupabaseClient()

  const { data } = await supabase
    .from("email_logs")
    .select("id")
    .eq("agent_id", agentId)
    .eq("gmail_message_id", gmailMessageId)
    .limit(1)
    .single()

  return !!data
}

/** Get the most recent email log per lead for preview (for inbox). */
export async function getLatestEmailPerLead(
  agentId: string,
  leadIds: string[],
): Promise<Map<string, EmailLogEntry>> {
  if (leadIds.length === 0) return new Map()

  const supabase = await createClerkSupabaseClient()

  const { data: rows } = await supabase
    .from("email_logs")
    .select("*")
    .eq("agent_id", agentId)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false })

  const map = new Map<string, EmailLogEntry>()
  for (const row of rows ?? []) {
    if (row.lead_id && !map.has(row.lead_id)) {
      map.set(row.lead_id, rowToEmailLog(row))
    }
  }
  return map
}
