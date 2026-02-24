"use server"

import { z } from "zod"
import { requireUser } from "@/lib/supabase/auth-server"
import { sendEmail } from "@/lib/email/resend"
import { buildQuoteSummaryEmail } from "@/lib/email/templates/quote-summary"
import { logActivity } from "@/lib/actions/log-activity"
import type { CarrierQuote } from "@/lib/types/quote"

/* ------------------------------------------------------------------ */
/*  Send Quote Email — server action                                   */
/* ------------------------------------------------------------------ */

const sendQuoteEmailSchema = z.object({
  leadId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1).max(200),
  coverageAmount: z.number().positive(),
  termLength: z.number().int().positive(),
  topCarriers: z
    .array(z.custom<CarrierQuote>())
    .min(1)
    .max(3),
})

type SendQuoteEmailInput = z.infer<typeof sendQuoteEmailSchema>

interface ActionResult {
  success: boolean
  error?: string
}

export async function sendQuoteEmail(input: SendQuoteEmailInput): Promise<ActionResult> {
  const user = await requireUser()
  const validated = sendQuoteEmailSchema.parse(input)

  const agentName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Your Agent"
  const agentEmail = user.email ?? ""
  const agentPhone = (user.user_metadata?.phone as string | undefined) ?? null

  const html = buildQuoteSummaryEmail({
    recipientName: validated.recipientName,
    coverageAmount: validated.coverageAmount,
    termLength: validated.termLength,
    topCarriers: validated.topCarriers,
    agentName,
    agentEmail,
    agentPhone,
  })

  try {
    await sendEmail({
      to: validated.recipientEmail,
      subject: `Your Life Insurance Quote Summary — ${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(validated.coverageAmount)} ${validated.termLength}-Year Term`,
      html,
    })
  } catch {
    return { success: false, error: "Failed to send email. Please try again." }
  }

  logActivity({
    leadId: validated.leadId,
    agentId: user.id,
    activityType: "email_sent",
    title: `Quote summary emailed to ${validated.recipientEmail}`,
    details: {
      recipient: validated.recipientEmail,
      subject: "Quote Summary",
      type: "quote_summary",
    },
  })

  return { success: true }
}
