import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { requireUser } from "@/lib/supabase/auth-server"
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
    const user = await requireUser()
    const numbers = await listPhoneNumbers(user.id)
    return NextResponse.json({ numbers })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list phone numbers" },
      { status: 500 },
    )
  }
}
