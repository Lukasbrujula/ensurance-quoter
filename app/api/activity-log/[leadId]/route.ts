import { z } from "zod"
import { getActivityLogs } from "@/lib/supabase/activities"
import { callLogLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"

const uuidSchema = z.string().uuid()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = callLogLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  const { leadId } = await params
  const parsed = uuidSchema.safeParse(leadId)
  if (!parsed.success) {
    return Response.json({ error: "Invalid lead ID" }, { status: 400 })
  }

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50)
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0)

  try {
    const result = await getActivityLogs(parsed.data, limit, offset)
    return Response.json(result)
  } catch (error) {
    if (error instanceof Error) {
      console.error("[activity-log] Fetch failed:", error.message)
    }
    return Response.json({ error: "Failed to load activities" }, { status: 500 })
  }
}
