import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
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
    const user = await requireUser()

    const url = new URL(request.url)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const since = url.searchParams.get("since") ?? startOfMonth.toISOString()
    const until = url.searchParams.get("until") ?? now.toISOString()

    const stats = await getUsageStats(user.id, since, until)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("GET /api/settings/usage error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load usage data" },
      { status: 500 },
    )
  }
}
