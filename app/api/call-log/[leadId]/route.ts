import { getCallLogs } from "@/lib/supabase/calls"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { leadId } = await params

  if (!leadId || !UUID_REGEX.test(leadId)) {
    return Response.json({ error: "Invalid leadId" }, { status: 400 })
  }

  try {
    const callLogs = await getCallLogs(leadId)
    return Response.json({ callLogs })
  } catch (error) {
    if (error instanceof Error) {
      console.error("[call-log/leadId] Fetch failed:", error.message)
    }
    return Response.json({ error: "Failed to load call logs" }, { status: 500 })
  }
}
