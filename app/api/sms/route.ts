import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { requireUser } from "@/lib/supabase/auth-server"
import { saveSmsLog, getSmsLogs } from "@/lib/supabase/sms"
import { getPrimaryPhoneNumber } from "@/lib/supabase/phone-numbers"
import { logActivity } from "@/lib/actions/log-activity"
import { normalizeToE164 } from "@/lib/utils/phone"
import type { SmsDetails } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const requestSchema = z.object({
  to: z.string().min(10, "Phone number required"),
  message: z.string().min(1, "Message required").max(1600, "Message too long"),
  leadId: z.string().uuid("Invalid lead ID"),
})

/* ------------------------------------------------------------------ */
/*  POST /api/sms                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  const { to, message, leadId } = parsed.data
  const toNumber = normalizeToE164(to)

  const telnyxApiKey = process.env.TELNYX_API_KEY
  if (!telnyxApiKey) {
    return NextResponse.json(
      { error: "SMS not configured" },
      { status: 503 },
    )
  }

  try {
    const user = await requireUser()

    // Resolve from number: agent's primary > env var fallback
    const primary = await getPrimaryPhoneNumber(user.id)
    const fromNumber = primary?.phoneNumber ?? process.env.TELNYX_CALLER_NUMBER
    if (!fromNumber) {
      return NextResponse.json(
        { error: "No from number configured. Purchase a phone number in Settings." },
        { status: 400 },
      )
    }

    // Send via Telnyx REST API
    const telnyxResponse = await fetch(
      "https://api.telnyx.com/v2/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${telnyxApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromNumber,
          to: toNumber,
          text: message,
          type: "SMS",
        }),
      },
    )

    if (!telnyxResponse.ok) {
      const errorBody = await telnyxResponse.text().catch(() => "Unknown error")
      console.error("[sms] Telnyx send failed:", telnyxResponse.status, errorBody.slice(0, 500))
      return NextResponse.json(
        { error: "Failed to send SMS" },
        { status: 502 },
      )
    }

    const telnyxData = (await telnyxResponse.json()) as {
      data?: { id?: string }
    }
    const telnyxMessageId = telnyxData.data?.id ?? null

    // Save to sms_logs (message gets encrypted in saveSmsLog)
    await saveSmsLog({
      leadId,
      agentId: user.id,
      direction: "outbound",
      toNumber,
      fromNumber,
      message,
      status: "sent",
      telnyxMessageId: telnyxMessageId ?? undefined,
    })

    // Log activity (fire-and-forget)
    const smsDetails: SmsDetails = {
      direction: "outbound",
      to: toNumber,
      message_preview: message.length > 80 ? `${message.slice(0, 80)}...` : message,
    }
    logActivity({
      leadId,
      agentId: user.id,
      activityType: "sms_sent",
      title: `SMS sent to ${toNumber}`,
      details: smsDetails as unknown as Record<string, unknown>,
    })

    return NextResponse.json({
      success: true,
      messageId: telnyxMessageId,
    })
  } catch (error) {
    console.error("[sms] POST error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/sms?leadId=...                                            */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const url = new URL(request.url)
  const leadId = url.searchParams.get("leadId")
  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 })
  }

  // Validate UUID format (matches POST handler's z.string().uuid())
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(leadId)) {
    return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 })
  }

  try {
    const user = await requireUser()
    const logs = await getSmsLogs(leadId, user.id)
    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[sms] GET error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load SMS logs" },
      { status: 500 },
    )
  }
}
