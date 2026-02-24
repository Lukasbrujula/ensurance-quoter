import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getPhoneNumberByNumber } from "@/lib/supabase/phone-numbers"
import { findLeadByPhone } from "@/lib/supabase/leads"
import { saveSmsLog } from "@/lib/supabase/sms"
import { normalizeToE164 } from "@/lib/utils/phone"
import type { Json } from "@/lib/types/database.generated"
import type { SmsDetails } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  POST /api/webhooks/sms — Telnyx inbound SMS webhook                */
/*  No auth guard — Telnyx calls this directly.                        */
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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TelnyxSmsPayload | null
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

    const agentId = phoneRecord.agentId

    // Find lead by from number
    let leadId: string
    const existingLead = await findLeadByPhone(agentId, fromNumber, serviceClient)

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

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    // Always return 200 to Telnyx to prevent retries
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ received: true, error: message }, { status: 200 })
  }
}
