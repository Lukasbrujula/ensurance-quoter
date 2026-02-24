import { saveSmsLog } from "@/lib/supabase/sms"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getPrimaryPhoneNumber } from "@/lib/supabase/phone-numbers"
import { logActivity } from "@/lib/actions/log-activity"
import { normalizeToE164 } from "@/lib/utils/phone"
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
  /** Explicit from number (E.164). Skips DB lookup + env fallback. */
  fromNumber?: string
  /** Use service-role client (for cron jobs where no user session exists) */
  serviceRole?: boolean
}

interface SendSmsResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Resolve the from number:
 * 1. Explicit `fromNumber` param
 * 2. Agent's primary purchased number (DB)
 * 3. TELNYX_CALLER_NUMBER env var (legacy global)
 */
async function resolveFromNumber(
  agentId: string,
  explicit?: string,
): Promise<string | null> {
  if (explicit) return explicit

  try {
    const serviceClient = createServiceRoleClient()
    const primary = await getPrimaryPhoneNumber(agentId, serviceClient)
    if (primary?.phoneNumber) return primary.phoneNumber
  } catch {
    // Fall through to env var
  }

  return process.env.TELNYX_CALLER_NUMBER ?? null
}

export async function sendSms({
  to,
  message,
  leadId,
  agentId,
  fromNumber: explicitFrom,
  serviceRole = false,
}: SendSmsInput): Promise<SendSmsResult> {
  const telnyxApiKey = process.env.TELNYX_API_KEY
  if (!telnyxApiKey) {
    return { success: false, error: "SMS not configured" }
  }

  const fromNumber = await resolveFromNumber(agentId, explicitFrom)
  if (!fromNumber) {
    return { success: false, error: "No from number configured" }
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
