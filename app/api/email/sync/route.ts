/* ------------------------------------------------------------------ */
/*  POST /api/email/sync — Sync emails from Gmail for a specific lead  */
/*  Fetches recent Gmail messages matching the lead's email address,   */
/*  deduplicates by gmail_message_id, and stores new ones.             */
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

const syncSchema = z.object({
  leadId: z.string().uuid(),
  leadEmail: z.string().email(),
})

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

    const body = await request.json()
    const parsed = syncSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { leadId, leadEmail } = parsed.data

    // Verify Gmail is connected
    const gmailConnected = await isGmailConnected(userId)
    if (!gmailConnected) {
      return NextResponse.json(
        { error: "Gmail not connected" },
        { status: 400 },
      )
    }

    const agentEmail = await getGmailAddress(userId)

    // Fetch messages from Gmail API
    const messages = await listGmailMessagesForLead(userId, leadEmail, 30)

    let synced = 0

    for (const msg of messages) {
      // Skip if already synced
      const exists = await emailExistsByGmailId(userId, msg.id)
      if (exists) continue

      // Determine direction based on From address
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
    }

    return NextResponse.json({ success: true, synced, total: messages.length })
  } catch (error) {
    console.error("POST /api/email/sync error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to sync emails" },
      { status: 500 },
    )
  }
}
