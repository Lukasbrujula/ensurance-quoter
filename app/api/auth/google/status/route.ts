/* ------------------------------------------------------------------ */
/*  GET /api/auth/google/status — Check Google Calendar connection     */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { isGoogleConfigured } from "@/lib/google/oauth"
import { getGoogleTokens } from "@/lib/supabase/google-integrations"

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const tokens = await getGoogleTokens(userId)

    return NextResponse.json({
      connected: tokens !== null,
      email: tokens?.email ?? null,
      configured: isGoogleConfigured(),
    })
  } catch (error) {
    console.error("GET /api/auth/google/status error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to check Google status" },
      { status: 500 },
    )
  }
}
