import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getPhoneNumberByNumber } from "@/lib/supabase/phone-numbers"
import { findLeadByPhone } from "@/lib/supabase/leads"
import { saveSmsLog } from "@/lib/supabase/sms"
import { normalizeToE164 } from "@/lib/utils/phone"
import { verifyTelnyxWebhook } from "@/lib/middleware/telnyx-webhook-verify"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import type { Json } from "@/lib/types/database.generated"
import type { SmsDetails } from "@/lib/types/activity"
import { evaluateUrgency } from "@/lib/data/urgency-keywords"

/* ------------------------------------------------------------------ */
/*  POST /api/webhooks/sms — Telnyx inbound SMS webhook                */
/*  Auth: ED25519 signature verification (same as AI agent webhook).   */
/*  Validates `to` number exists in our DB.                            */
/* ------------------------------------------------------------------ */

interface TelnyxSmsPayload {
  data?: {
    event_type?: string
    payload?: {
      from?: { phone_number?: string }
      to?: Array<{ phone_number?: string }>
      text?: string
      id?: string
    }
  }
}

/* ------------------------------------------------------------------ */
/*  STOP/HELP keyword constants                                        */
/* ------------------------------------------------------------------ */

const STOP_KEYWORDS = new Set(["stop", "unsubscribe", "cancel", "end", "quit"])
const HELP_KEYWORDS = new Set(["help", "info"])

const OPT_OUT_RESPONSE =
  "You have been unsubscribed and will no longer receive SMS messages. Reply START to re-subscribe."
const HELP_RESPONSE =
  "Reply STOP to opt out of messages. For assistance, contact your insurance agent directly."
const OPT_IN_RESPONSE =
  "You have been re-subscribed and may receive SMS messages again."

/* ------------------------------------------------------------------ */
/*  Send auto-reply via Telnyx                                         */
/* ------------------------------------------------------------------ */

async function sendAutoReply(
  from: string,
  to: string,
  text: string,
): Promise<void> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) return

  await fetch("https://api.telnyx.com/v2/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, text, type: "SMS" }),
  }).catch(() => {
    // Fire-and-forget — don't block webhook processing
  })
}

/* ------------------------------------------------------------------ */
/*  Webhook handler                                                    */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  // Rate limit by IP — generous for webhooks
  const rl = await checkRateLimit(rateLimiters.webhook, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  // Verify Telnyx webhook signature (ED25519)
  const rawBody = await request.text()
  const sigResult = verifyTelnyxWebhook(
    rawBody,
    request.headers.get("telnyx-signature-ed25519"),
    request.headers.get("telnyx-timestamp"),
  )
  if (!sigResult.valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const body = (JSON.parse(rawBody) as TelnyxSmsPayload | null) ?? null
  if (!body?.data?.payload) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const eventType = body.data.event_type
  if (eventType !== "message.received") {
    // Acknowledge non-inbound events (delivery receipts, etc.)
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const payload = body.data.payload
  const fromRaw = payload.from?.phone_number
  const toRaw = payload.to?.[0]?.phone_number
  const text = payload.text ?? ""
  const telnyxMessageId = payload.id

  if (!fromRaw || !toRaw) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const fromNumber = normalizeToE164(fromRaw)
  const toNumber = normalizeToE164(toRaw)

  const serviceClient = createServiceRoleClient()

  try {
    // Look up `to` number in our DB to get the agent
    const phoneRecord = await getPhoneNumberByNumber(toNumber, serviceClient)
    if (!phoneRecord) {
      // Not our number — ignore
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Route to assignee if set, otherwise to the number's owner
    const agentId = phoneRecord.assigneeAgentId ?? phoneRecord.agentId
    const normalizedText = text.trim().toLowerCase()

    // ----------------------------------------------------------------
    // STOP keyword handling — opt out the lead
    // ----------------------------------------------------------------
    if (STOP_KEYWORDS.has(normalizedText)) {
      // Find existing lead and set opt-out flag
      const existingLead = await findLeadByPhone(agentId, fromNumber, serviceClient)
      if (existingLead) {
        await serviceClient
          .from("leads")
          .update({
            sms_opt_out: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLead.id)
      }

      // Send opt-out confirmation
      await sendAutoReply(toNumber, fromNumber, OPT_OUT_RESPONSE)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // ----------------------------------------------------------------
    // HELP keyword handling — send help response
    // ----------------------------------------------------------------
    if (HELP_KEYWORDS.has(normalizedText)) {
      await sendAutoReply(toNumber, fromNumber, HELP_RESPONSE)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // ----------------------------------------------------------------
    // START keyword handling — re-subscribe
    // ----------------------------------------------------------------
    if (normalizedText === "start") {
      const existingLead = await findLeadByPhone(agentId, fromNumber, serviceClient)
      if (existingLead) {
        await serviceClient
          .from("leads")
          .update({
            sms_opt_out: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLead.id)
      }

      await sendAutoReply(toNumber, fromNumber, OPT_IN_RESPONSE)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // ----------------------------------------------------------------
    // Regular inbound message
    // ----------------------------------------------------------------

    // Find lead by from number — try assignee first, fall back to owner
    let leadId: string
    let existingLead = await findLeadByPhone(agentId, fromNumber, serviceClient)
    if (!existingLead && phoneRecord.assigneeAgentId && phoneRecord.assigneeAgentId !== phoneRecord.agentId) {
      existingLead = await findLeadByPhone(phoneRecord.agentId, fromNumber, serviceClient)
    }

    if (existingLead) {
      leadId = existingLead.id
    } else {
      // Auto-create lead if no match
      const { data: newLead, error: insertError } = await serviceClient
        .from("leads")
        .insert({
          agent_id: agentId,
          phone: fromNumber,
          first_name: "Unknown",
          source: "sms",
          status: "new",
        })
        .select("id")
        .single()

      if (insertError || !newLead) {
        throw new Error(`Failed to create lead: ${insertError?.message ?? "Unknown"}`)
      }
      leadId = newLead.id
    }

    // Save inbound SMS log
    await saveSmsLog(
      {
        leadId,
        agentId,
        direction: "inbound",
        toNumber,
        fromNumber,
        message: text,
        status: "received",
        telnyxMessageId: telnyxMessageId ?? undefined,
      },
      serviceClient,
    )

    // Log activity
    const smsDetails: SmsDetails = {
      direction: "inbound",
      to: toNumber,
      message_preview: text.length > 80 ? `${text.slice(0, 80)}...` : text,
    }

    await serviceClient.from("activity_logs").insert({
      lead_id: leadId,
      agent_id: agentId,
      activity_type: "sms_received",
      title: `SMS received from ${fromNumber}`,
      details: smsDetails as unknown as Json,
    })

    // Check urgency: keywords + lead context (pipeline status, overdue follow-up)
    const leadForUrgency = existingLead
      ? await serviceClient
          .from("leads")
          .select("status, follow_up_date")
          .eq("id", leadId)
          .single()
          .then((r) => r.data)
      : null

    const isUrgent = evaluateUrgency(
      text,
      leadForUrgency?.status ?? null,
      leadForUrgency?.follow_up_date ?? null,
    )

    if (isUrgent) {
      await serviceClient
        .from("leads")
        .update({ urgent: true, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", leadId)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    // Always return 200 to Telnyx to prevent retries — don't leak internals
    if (error instanceof Error) {
      console.error("[webhooks/sms] Processing failed:", error.message)
    }
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
