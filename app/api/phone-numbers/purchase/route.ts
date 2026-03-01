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
import { orderPhoneNumber } from "@/lib/telnyx/phone-numbers"
import { createMessagingProfile } from "@/lib/telnyx/messaging-profiles"
import { getMessagingProfileId, setMessagingProfileId } from "@/lib/supabase/settings"
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

  const { phoneNumber, label, aiAgentId } = parsed.data

  try {
    const user = await requireUser()

    // Get or create messaging profile (lazy)
    let profileId = await getMessagingProfileId(user.id)
    if (!profileId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000"
      const webhookUrl = `${appUrl}/api/webhooks/sms`
      const profile = await createMessagingProfile(
        `ensurance-${user.id.slice(0, 8)}`,
        webhookUrl,
      )
      profileId = profile.id
      await setMessagingProfileId(user.id, profileId)
    }

    // Order the number on Telnyx
    const order = await orderPhoneNumber(phoneNumber, profileId)

    // Check if this is the first number (make it primary)
    const existing = await listPhoneNumbers(user.id)
    const isFirst = existing.length === 0

    // Save to DB
    const saved = await createPhoneNumber({
      agentId: user.id,
      phoneNumber: order.phoneNumber,
      telnyxPhoneNumberId: order.phoneNumberId,
      aiAgentId,
      isPrimary: isFirst,
      label,
    })

    return NextResponse.json({ number: saved })
  } catch (error) {
    console.error("[phone-numbers] Purchase error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to purchase phone number" },
      { status: 500 },
    )
  }
}
