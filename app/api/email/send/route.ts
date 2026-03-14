/* ------------------------------------------------------------------ */
/*  POST /api/email/send — Send email via agent's connected Gmail      */
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
import { sendGmailMessage, getGmailAddress } from "@/lib/google/gmail-service"
import { saveEmailLog } from "@/lib/supabase/email"

const sendEmailSchema = z.object({
  leadId: z.string().uuid(),
  to: z.string().email(),
  cc: z.string().optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50_000),
  threadId: z.string().optional(),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId, has } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (has && !has({ feature: "gmail_integration" })) {
      return NextResponse.json(
        { error: "This feature requires a Pro plan. Upgrade at /pricing." },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = sendEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { leadId, to, cc, subject, body: emailBody, threadId } = parsed.data

    // Verify Gmail is connected
    const gmailConnected = await isGmailConnected(userId)
    if (!gmailConnected) {
      return NextResponse.json(
        { error: "Gmail not connected. Connect your Gmail in Settings → Integrations." },
        { status: 400 },
      )
    }

    // Send via Gmail API
    const result = await sendGmailMessage(userId, {
      to,
      cc,
      subject,
      body: emailBody,
      threadId,
    })

    if (!result) {
      return NextResponse.json(
        { error: "Failed to send email. Please reconnect your Gmail." },
        { status: 500 },
      )
    }

    // Get agent's Gmail address for the from field
    const fromAddress = (await getGmailAddress(userId)) ?? userId

    // Save to email_logs
    const log = await saveEmailLog({
      agentId: userId,
      leadId,
      direction: "outbound",
      fromAddress,
      toAddress: to,
      ccAddress: cc ?? null,
      subject,
      bodySnippet: emailBody.replace(/<[^>]*>/g, "").slice(0, 200),
      bodyHtml: emailBody,
      gmailMessageId: result.messageId,
      gmailThreadId: result.threadId,
      hasAttachments: false,
      isRead: true,
    })

    return NextResponse.json({ success: true, email: log })
  } catch (error) {
    console.error("POST /api/email/send error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    )
  }
}
