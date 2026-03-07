import { z } from "zod"
import { getCallCounts } from "@/lib/supabase/calls"
import { auth } from "@clerk/nextjs/server"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const querySchema = z.object({
  leadIds: z.string().min(1),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({ leadIds: url.searchParams.get("leadIds") })

  if (!parsed.success) {
    return Response.json(
      { error: "leadIds query parameter is required" },
      { status: 400 },
    )
  }

  const leadIds = parsed.data.leadIds
    .split(",")
    .filter(Boolean)
    .filter((id) => UUID_REGEX.test(id))

  if (leadIds.length === 0) {
    return Response.json({ counts: {} })
  }

  if (leadIds.length > 100) {
    return Response.json(
      { error: "Too many leadIds (max 100)" },
      { status: 400 },
    )
  }

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const counts = await getCallCounts(leadIds, userId)
    return Response.json({ counts })
  } catch (error) {
    if (error instanceof Error) {
      console.error("[call-log/counts] Fetch failed:", error.message)
    }
    return Response.json({ error: "Failed to load call counts" }, { status: 500 })
  }
}
