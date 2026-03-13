import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
import { format, subWeeks, startOfWeek } from "date-fns"

/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/activity-chart                                  */
/*  Returns activity_logs grouped by week (last 12 weeks) for the     */
/*  three key activity types: lead_created, call, quote.               */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClerkSupabaseClient()
    const twelveWeeksAgo = subWeeks(new Date(), 12)

    const { data, error } = await supabase
      .from("activity_logs")
      .select("activity_type, created_at")
      .eq("agent_id", userId)
      .in("activity_type", ["lead_created", "call", "quote"])
      .gte("created_at", twelveWeeksAgo.toISOString())
      .order("created_at", { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    // Group into week buckets
    const weekMap = new Map<string, Map<string, number>>()

    // Pre-fill all 12 weeks so the chart has no gaps
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
      const weekLabel = format(weekStart, "MMM d")
      weekMap.set(weekLabel, new Map())
    }

    for (const row of data ?? []) {
      const weekStart = startOfWeek(new Date(row.created_at!), { weekStartsOn: 1 })
      const weekLabel = format(weekStart, "MMM d")
      const typeCounts = weekMap.get(weekLabel) ?? new Map<string, number>()
      typeCounts.set(
        row.activity_type,
        (typeCounts.get(row.activity_type) ?? 0) + 1,
      )
      weekMap.set(weekLabel, typeCounts)
    }

    // Flatten to response format
    const result: Array<{ activity_type: string; week: string; count: number }> = []
    for (const [week, typeCounts] of weekMap) {
      for (const actType of ["lead_created", "call", "quote"]) {
        result.push({
          activity_type: actType,
          week,
          count: typeCounts.get(actType) ?? 0,
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error(
      "GET /api/dashboard/activity-chart error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to load activity chart data" },
      { status: 500 },
    )
  }
}
