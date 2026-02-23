import { z } from "zod"
import { insertActivityLog } from "@/lib/supabase/activities"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"

const insertSchema = z.object({
  leadId: z.string().uuid(),
  agentId: z.string().uuid(),
  activityType: z.enum([
    "lead_created",
    "status_change",
    "call",
    "quote",
    "enrichment",
    "follow_up",
    "note",
    "lead_updated",
  ]),
  title: z.string().min(1).max(500),
  details: z.record(z.string(), z.unknown()).nullish(),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = insertSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const activity = await insertActivityLog({
      leadId: parsed.data.leadId,
      agentId: parsed.data.agentId,
      activityType: parsed.data.activityType,
      title: parsed.data.title,
      details: parsed.data.details ?? null,
    })
    return Response.json({ success: true, activity })
  } catch (error) {
    if (error instanceof Error) {
      console.error("[activity-log] Insert failed:", error.message)
    }
    return Response.json({ error: "Failed to save activity" }, { status: 500 })
  }
}
