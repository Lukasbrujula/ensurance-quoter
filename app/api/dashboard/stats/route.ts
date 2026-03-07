import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getDashboardStats } from "@/lib/supabase/dashboard"

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/stats                                           */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const stats = await getDashboardStats(userId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 },
    )
  }
}
