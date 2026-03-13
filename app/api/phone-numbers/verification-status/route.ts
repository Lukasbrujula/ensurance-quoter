import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import {
  getTollFreeVerificationStatus,
  type TollFreeVerificationStatus,
} from "@/lib/telnyx/phone-numbers"

/* ------------------------------------------------------------------ */
/*  POST /api/phone-numbers/verification-status                        */
/*  Returns toll-free verification status for given phone numbers.     */
/* ------------------------------------------------------------------ */

const schema = z.object({
  phoneNumbers: z.array(z.string()).min(1).max(20),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  try {
    const statuses: Record<string, TollFreeVerificationStatus> = {}

    await Promise.all(
      parsed.data.phoneNumbers.map(async (num) => {
        statuses[num] = await getTollFreeVerificationStatus(num)
      }),
    )

    return NextResponse.json({ statuses })
  } catch (error) {
    console.error(
      "[phone-numbers] Verification status error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 },
    )
  }
}
