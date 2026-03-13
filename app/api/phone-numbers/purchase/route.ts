import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
import { orderPhoneNumber } from "@/lib/telnyx/phone-numbers"
import { createMessagingProfile } from "@/lib/telnyx/messaging-profiles"
import {
  getBillingGroupId,
  getMessagingProfileId,
  setMessagingProfileId,
} from "@/lib/supabase/settings"
import {
  createPhoneNumber,
  listPhoneNumbers,
} from "@/lib/supabase/phone-numbers"

/* ------------------------------------------------------------------ */
/*  POST /api/phone-numbers/purchase — buy a Telnyx number             */
/* ------------------------------------------------------------------ */

const purchaseSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number required"),
  label: z.string().max(100).optional(),
  aiAgentId: z.string().uuid().optional(),
  numberType: z.enum(["local", "toll_free"]).optional(),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.auth, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = purchaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  const { phoneNumber, label, aiAgentId, numberType = "local" } = parsed.data

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Get or create messaging profile (lazy)
    let profileId = await getMessagingProfileId(userId)
    if (!profileId) {
      // Telnyx rejects localhost URLs — use production URL for webhook
      const appUrl = process.env.TELNYX_WEBHOOK_BASE_URL
        ?? process.env.NEXT_PUBLIC_APP_URL
        ?? "https://ensurance-quoter.vercel.app"
      const webhookUrl = `${appUrl}/api/webhooks/sms`
      const profile = await createMessagingProfile(
        `ensurance-${userId.slice(0, 8)}`,
        webhookUrl,
      )
      profileId = profile.id
      await setMessagingProfileId(userId, profileId)
    }

    // Order the number on Telnyx (attach billing group if provisioned)
    const billingGroupId = await getBillingGroupId(userId)
    const connectionId = numberType === "local" ? process.env.TELNYX_CONNECTION_ID : undefined
    const order = await orderPhoneNumber(phoneNumber, profileId, billingGroupId ?? undefined, connectionId)

    // Check if this is the first number (make it primary)
    const existing = await listPhoneNumbers(userId)
    const isFirst = existing.length === 0

    // Save to DB
    const saved = await createPhoneNumber({
      agentId: userId,
      phoneNumber: order.phoneNumber,
      telnyxPhoneNumberId: order.phoneNumberId,
      aiAgentId,
      isPrimary: isFirst,
      label,
      numberType,
    })

    return NextResponse.json({ number: saved })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[phone-numbers] Purchase error:", message)
    return NextResponse.json(
      { error: message.includes("Telnyx API error") ? message : "Failed to purchase phone number" },
      { status: 500 },
    )
  }
}
