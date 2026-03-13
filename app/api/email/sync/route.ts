/* ------------------------------------------------------------------ */
/*  POST /api/email/sync                                               */
/*  Two modes:                                                         */
/*  1. Single lead: { leadId, leadEmail } — syncs one lead             */
/*  2. Batch mode:  {} (no body or empty) — syncs top 20 active leads  */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { isGmailConnected } from "@/lib/supabase/google-integrations"
import { listGmailMessagesForLead, getGmailAddress } from "@/lib/google/gmail-service"
import { saveEmailLog, emailExistsByGmailId } from "@/lib/supabase/email"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
import { evaluateUrgency } from "@/lib/data/urgency-keywords"

const singleLeadSchema = z.object({
  leadId: z.string().uuid(),
  leadEmail: z.string().email(),
})

const BATCH_LEAD_LIMIT = 20

/**
 * Sync emails for a single lead. Returns synced count.
 */
async function syncSingleLead(
  userId: string,
  leadId: string,
  leadEmail: string,
  agentEmail: string | null,
): Promise<{ synced: number; total: number }> {
  const messages = await listGmailMessagesForLead(userId, leadEmail, 30)

  let synced = 0
  let urgencyFlagged = false

  for (const msg of messages) {
    const exists = await emailExistsByGmailId(userId, msg.id)
    if (exists) continue

    const fromLower = msg.from.toLowerCase()
    const isFromAgent = agentEmail
      ? fromLower.includes(agentEmail.toLowerCase())
      : false
    const direction = isFromAgent ? "outbound" as const : "inbound" as const

    await saveEmailLog({
      agentId: userId,
      leadId,
      direction,
      fromAddress: msg.from,
      toAddress: msg.to,
      ccAddress: msg.cc,
      subject: msg.subject,
      bodySnippet: msg.bodySnippet,
      bodyHtml: msg.bodyHtml,
      gmailMessageId: msg.id,
      gmailThreadId: msg.threadId,
      hasAttachments: msg.hasAttachments,
      isRead: direction === "outbound",
    })

    synced++

    if (direction === "inbound" && !urgencyFlagged) {
      const textToCheck = `${msg.subject ?? ""} ${msg.bodySnippet ?? ""}`
      if (evaluateUrgency(textToCheck, null, null)) {
        urgencyFlagged = true
      }
    }
  }

  if (urgencyFlagged) {
    const supabase = await createClerkSupabaseClient()
    await supabase
      .from("leads")
      .update({ urgent: true, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", leadId)
      .eq("agent_id", userId)
  }

  return { synced, total: messages.length }
}

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify Gmail is connected
    const gmailConnected = await isGmailConnected(userId)
    if (!gmailConnected) {
      return NextResponse.json(
        { error: "Gmail not connected" },
        { status: 400 },
      )
    }

    const body = await request.json().catch(() => ({}))

    // Single-lead mode: { leadId, leadEmail }
    const parsed = singleLeadSchema.safeParse(body)
    if (parsed.success) {
      const { leadId, leadEmail } = parsed.data
      const agentEmail = await getGmailAddress(userId)
      const result = await syncSingleLead(userId, leadId, leadEmail, agentEmail)
      return NextResponse.json({ success: true, ...result })
    }

    // Batch mode: no leadId — sync top N active leads
    const agentEmail = await getGmailAddress(userId)
    const supabase = await createClerkSupabaseClient()

    const { data: leads } = await supabase
      .from("leads")
      .select("id, email")
      .eq("agent_id", userId)
      .not("email", "is", null)
      .order("updated_at", { ascending: false })
      .limit(BATCH_LEAD_LIMIT)

    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, synced: 0, leadsChecked: 0 })
    }

    let totalSynced = 0
    let leadsChecked = 0

    for (const lead of leads) {
      if (!lead.email) continue
      try {
        const { synced } = await syncSingleLead(userId, lead.id, lead.email, agentEmail)
        totalSynced += synced
        leadsChecked++
      } catch {
        // Skip failed leads, continue with next
      }
    }

    return NextResponse.json({ success: true, synced: totalSynced, leadsChecked })
  } catch (error) {
    console.error("POST /api/email/sync error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to sync emails" },
      { status: 500 },
    )
  }
}
