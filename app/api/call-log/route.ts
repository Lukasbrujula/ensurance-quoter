import { z } from "zod"
import { saveCallLog } from "@/lib/supabase/calls"
import { callLogLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"

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
  const rl = callLogLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

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
    return Response.json({ success: true, callLog })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save call log"
    return Response.json({ error: message }, { status: 500 })
  }
}
