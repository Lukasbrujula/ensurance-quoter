/* ------------------------------------------------------------------ */
/*  Background Email Sync Job                                         */
/*  Syncs Gmail messages for all connected agents.                    */
/*  Called by cron (no user session — uses service role client).       */
/* ------------------------------------------------------------------ */

import { createServiceRoleClient } from "@/lib/supabase/server"
import { listGmailMessagesForLead, getGmailAddress } from "@/lib/google/gmail-service"
import { encrypt } from "@/lib/encryption/crypto"
import { evaluateUrgency } from "@/lib/data/urgency-keywords"

const MAX_LEADS_PER_AGENT = 50
const DELAY_BETWEEN_LEADS_MS = 200

interface SyncReport {
  agentsProcessed: number
  agentsSkipped: number
  totalSynced: number
  errors: string[]
}

/**
 * Small delay to avoid hammering the Gmail API.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Sync emails for a single lead belonging to an agent.
 * Uses service role client (no user session).
 * Returns the number of new emails synced.
 */
async function syncLeadEmails(
  agentId: string,
  leadId: string,
  leadEmail: string,
  agentEmail: string | null,
): Promise<{ synced: number; urgencyFlagged: boolean }> {
  const supabase = createServiceRoleClient()

  const messages = await listGmailMessagesForLead(agentId, leadEmail, 30)

  let synced = 0
  let urgencyFlagged = false

  for (const msg of messages) {
    // Check if already synced (dedup by gmail_message_id)
    const { data: existing } = await supabase
      .from("email_logs")
      .select("id")
      .eq("agent_id", agentId)
      .eq("gmail_message_id", msg.id)
      .limit(1)
      .single()

    if (existing) continue

    const fromLower = msg.from.toLowerCase()
    const isFromAgent = agentEmail
      ? fromLower.includes(agentEmail.toLowerCase())
      : false
    const direction = isFromAgent ? "outbound" : "inbound"

    const { error } = await supabase.from("email_logs").insert({
      agent_id: agentId,
      lead_id: leadId,
      provider: "gmail",
      gmail_message_id: msg.id,
      gmail_thread_id: msg.threadId,
      direction,
      from_address: msg.from,
      to_address: msg.to,
      cc_address: msg.cc ?? null,
      subject: msg.subject ? encrypt(msg.subject) : null,
      body_snippet: msg.bodySnippet ? encrypt(msg.bodySnippet) : null,
      body_html: msg.bodyHtml ? encrypt(msg.bodyHtml) : null,
      has_attachments: msg.hasAttachments,
      is_read: direction === "outbound",
    })

    if (error) continue

    synced++

    // Check urgency on inbound emails (once per lead sync)
    if (direction === "inbound" && !urgencyFlagged) {
      const textToCheck = `${msg.subject ?? ""} ${msg.bodySnippet ?? ""}`
      if (evaluateUrgency(textToCheck, null, null)) {
        urgencyFlagged = true
      }
    }
  }

  return { synced, urgencyFlagged }
}

/**
 * Run background email sync for all Gmail-connected agents.
 * Processes agents sequentially, limits leads per agent.
 */
export async function runEmailSync(): Promise<SyncReport> {
  const supabase = createServiceRoleClient()

  const report: SyncReport = {
    agentsProcessed: 0,
    agentsSkipped: 0,
    totalSynced: 0,
    errors: [],
  }

  // Get all agents with Gmail connected
  const { data: integrations, error: intError } = await supabase
    .from("google_integrations")
    .select("agent_id")
    .eq("gmail_connected", true)

  if (intError || !integrations || integrations.length === 0) {
    return report
  }

  for (const integration of integrations) {
    const agentId = integration.agent_id

    try {
      // Get agent's Gmail address (also validates token)
      const agentEmail = await getGmailAddress(agentId)

      // Get agent's leads with email, ordered by most recent activity
      const { data: leads } = await supabase
        .from("leads")
        .select("id, email, status, follow_up_date")
        .eq("agent_id", agentId)
        .not("email", "is", null)
        .order("updated_at", { ascending: false })
        .limit(MAX_LEADS_PER_AGENT)

      if (!leads || leads.length === 0) {
        report.agentsProcessed++
        continue
      }

      for (const lead of leads) {
        if (!lead.email) continue

        try {
          const { synced, urgencyFlagged } = await syncLeadEmails(
            agentId,
            lead.id,
            lead.email,
            agentEmail,
          )

          report.totalSynced += synced

          // Flag lead as urgent if triggered
          if (urgencyFlagged) {
            await supabase
              .from("leads")
              .update({
                urgent: true,
                updated_at: new Date().toISOString(),
              } as Record<string, unknown>)
              .eq("id", lead.id)
              .eq("agent_id", agentId)
          }
        } catch (leadErr) {
          // Skip this lead, continue with next
          report.errors.push(
            `Lead ${lead.id} (agent ${agentId}): ${leadErr instanceof Error ? leadErr.message : String(leadErr)}`,
          )
        }

        await delay(DELAY_BETWEEN_LEADS_MS)
      }

      report.agentsProcessed++
    } catch (agentErr) {
      // Token expired / refresh failed — skip this agent
      report.agentsSkipped++
      report.errors.push(
        `Agent ${agentId}: ${agentErr instanceof Error ? agentErr.message : String(agentErr)}`,
      )
    }
  }

  return report
}
