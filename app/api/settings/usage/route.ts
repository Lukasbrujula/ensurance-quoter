import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getUsageStats } from "@/lib/supabase/usage"

/* ------------------------------------------------------------------ */
/*  GET /api/settings/usage?since=&until=                              */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const sinceRaw = url.searchParams.get("since")
    const untilRaw = url.searchParams.get("until")

    // Validate date format and clamp range to max 1 year
    const maxRange = 365 * 24 * 60 * 60 * 1000
    const sinceDate = sinceRaw ? new Date(sinceRaw) : startOfMonth
    const untilDate = untilRaw ? new Date(untilRaw) : now

    if (isNaN(sinceDate.getTime()) || isNaN(untilDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    if (untilDate.getTime() - sinceDate.getTime() > maxRange) {
      return NextResponse.json({ error: "Date range cannot exceed 1 year" }, { status: 400 })
    }

    if (sinceDate > untilDate) {
      return NextResponse.json({ error: "since must be before until" }, { status: 400 })
    }

    const since = sinceDate.toISOString()
    const until = untilDate.toISOString()

    const stats = await getUsageStats(userId, since, until)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("GET /api/settings/usage error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load usage data" },
      { status: 500 },
    )
  }
}
