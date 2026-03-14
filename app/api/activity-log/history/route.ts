import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import {
  getGlobalActivityLogs,
  getGlobalActivityLogsByOrg,
  getActivityCategoryCounts,
  getActivityCategoryCountsByOrg,
} from "@/lib/supabase/activities"
import type { HistoryCategory } from "@/lib/supabase/activities"

const VALID_CATEGORIES = new Set<HistoryCategory>(["all", "calls", "quotes", "messages", "notes", "system"])

/* ------------------------------------------------------------------ */
/*  GET /api/activity-log/history                                      */
/*  ?scope=team → org-scoped history (requires active org)             */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { userId, orgId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const scope = url.searchParams.get("scope") ?? "personal"
  const category = (url.searchParams.get("category") ?? "all") as HistoryCategory
  if (!VALID_CATEGORIES.has(category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 })
  }

  const rawLimit = Number(url.searchParams.get("limit") ?? "30")
  const rawOffset = Number(url.searchParams.get("offset") ?? "0")
  const limit = Math.min(Number.isFinite(rawLimit) ? rawLimit : 30, 50)
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0)
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined
  const dateTo = url.searchParams.get("dateTo") ?? undefined
  const includeCounts = url.searchParams.get("counts") === "true"

  const useTeam = scope === "team" && !!orgId

  try {
    const [result, counts] = await Promise.all([
      useTeam
        ? getGlobalActivityLogsByOrg(orgId, category, limit, offset, dateFrom, dateTo)
        : getGlobalActivityLogs(userId, category, limit, offset, dateFrom, dateTo),
      includeCounts
        ? (useTeam ? getActivityCategoryCountsByOrg(orgId) : getActivityCategoryCounts(userId))
        : Promise.resolve(undefined),
    ])

    return Response.json({ ...result, counts })
  } catch (error) {
    if (error instanceof Error) {
      console.error("[activity-log/history] Fetch failed:", error.message)
    }
    return Response.json({ error: "Failed to load history" }, { status: 500 })
  }
}
