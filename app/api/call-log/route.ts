import { z } from "zod"
import { saveCallLog } from "@/lib/supabase/calls"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { logActivity } from "@/lib/actions/log-activity"
import { getCurrentUser } from "@/lib/supabase/auth-server"

const saveSchema = z.object({
  leadId: z.string().uuid(),
  direction: z.enum(["inbound", "outbound"]),
  provider: z.enum(["telnyx", "ringba"]),
  providerCallId: z.string().nullish(),
  durationSeconds: z.number().int().min(0).nullish(),
  transcriptText: z.string().nullish(),
  aiSummary: z.string().nullish(),
  coachingHints: z
    .array(
      z.object({
        type: z.string(),
        text: z.string(),
        timestamp: z.number(),
        relatedCarriers: z.array(z.string()),
      }),
    )
    .nullish(),
  startedAt: z.string().nullish(),
  endedAt: z.string().nullish(),
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

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const callLog = await saveCallLog(parsed.data)

    // Fire-and-forget activity log
    const user = await getCurrentUser()
    if (user) {
      const durationSec = parsed.data.durationSeconds ?? 0
      const durationStr = durationSec > 0
        ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
        : "0:00"

      logActivity({
        leadId: parsed.data.leadId,
        agentId: user.id,
        activityType: "call",
        title: `${parsed.data.direction === "inbound" ? "Inbound" : "Outbound"} call — ${durationStr}`,
        details: {
          direction: parsed.data.direction,
          duration_seconds: parsed.data.durationSeconds ?? null,
          has_transcript: Boolean(parsed.data.transcriptText),
        },
      })
    }

    return Response.json({ success: true, callLog })
  } catch (error) {
    if (error instanceof Error) {
      console.error("[call-log] Save failed:", error.message)
    }
    return Response.json({ error: "Failed to save call log" }, { status: 500 })
  }
}
