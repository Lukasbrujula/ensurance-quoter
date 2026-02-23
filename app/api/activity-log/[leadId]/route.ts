import { z } from "zod"
import { getActivityLogs } from "@/lib/supabase/activities"
import { requireUser } from "@/lib/supabase/auth-server"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"

const uuidSchema = z.string().uuid()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { leadId } = await params
  const parsed = uuidSchema.safeParse(leadId)
  if (!parsed.success) {
    return Response.json({ error: "Invalid lead ID" }, { status: 400 })
  }

  const url = new URL(request.url)
  const rawLimit = Number(url.searchParams.get("limit") ?? "20")
  const rawOffset = Number(url.searchParams.get("offset") ?? "0")
  const limit = Math.min(Number.isFinite(rawLimit) ? rawLimit : 20, 50)
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0)

  try {
    const user = await requireUser()
    const result = await getActivityLogs(parsed.data, user.id, limit, offset)
    return Response.json(result)
  } catch (error) {
    if (error instanceof Error) {
      console.error("[activity-log] Fetch failed:", error.message)
    }
    return Response.json({ error: "Failed to load activities" }, { status: 500 })
  }
}
