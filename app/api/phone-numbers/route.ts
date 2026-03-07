import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
import { listPhoneNumbers } from "@/lib/supabase/phone-numbers"

/* ------------------------------------------------------------------ */
/*  GET /api/phone-numbers — list agent's phone numbers                */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const numbers = await listPhoneNumbers(userId)
    return NextResponse.json({ numbers })
  } catch (error) {
    console.error("[phone-numbers] GET error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to list phone numbers" },
      { status: 500 },
    )
  }
}
