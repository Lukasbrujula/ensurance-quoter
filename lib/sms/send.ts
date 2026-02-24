import { saveSmsLog } from "@/lib/supabase/sms"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { logActivity } from "@/lib/actions/log-activity"
import type { SmsDetails } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  Shared SMS sending function                                        */
/*  Used by both the API route (user-triggered) and the cron job.      */
/* ------------------------------------------------------------------ */

interface SendSmsInput {
  to: string
  message: string
  leadId: string
  agentId: string
  /** Use service-role client (for cron jobs where no user session exists) */
  serviceRole?: boolean
}

interface SendSmsResult {
  success: boolean
  messageId?: string
  error?: string
}

/** Normalize a phone number to E.164 format (US numbers). */
function normalizeToE164(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  if (phone.startsWith("+") && digits.length >= 10) return `+${digits}`
  return `+${digits}`
}

export async function sendSms({
  to,
  message,
  leadId,
  agentId,
  serviceRole = false,
}: SendSmsInput): Promise<SendSmsResult> {
  const telnyxApiKey = process.env.TELNYX_API_KEY
  const fromNumber = process.env.TELNYX_CALLER_NUMBER
  if (!telnyxApiKey || !fromNumber) {
    return { success: false, error: "SMS not configured" }
  }

  const toNumber = normalizeToE164(to)

  try {
    const telnyxResponse = await fetch("https://api.telnyx.com/v2/messages", {
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
    })

    if (!telnyxResponse.ok) {
      const errorBody = await telnyxResponse.text().catch(() => "Unknown error")
      return { success: false, error: `Telnyx error: ${telnyxResponse.status} ${errorBody}` }
    }

    const telnyxData = (await telnyxResponse.json()) as {
      data?: { id?: string }
    }
    const messageId = telnyxData.data?.id ?? undefined

    // Save log — use service-role client for cron
    const client = serviceRole ? createServiceRoleClient() : undefined
    await saveSmsLog(
      {
        leadId,
        agentId,
        direction: "outbound",
        toNumber,
        fromNumber,
        message,
        status: "sent",
        telnyxMessageId: messageId,
      },
      client,
    )

    // Log activity (fire-and-forget)
    const smsDetails: SmsDetails = {
      direction: "outbound",
      to: toNumber,
      message_preview: message.length > 80 ? `${message.slice(0, 80)}...` : message,
    }
    logActivity({
      leadId,
      agentId,
      activityType: "sms_sent",
      title: `SMS sent to ${toNumber}`,
      details: smsDetails as unknown as Record<string, unknown>,
    })

    return { success: true, messageId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send SMS",
    }
  }
}
