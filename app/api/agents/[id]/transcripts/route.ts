import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  agentsTranscriptLimiter,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { insertTranscriptMessages } from "@/lib/supabase/ai-agents"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const storeTranscriptSchema = z.object({
  call_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["assistant", "user", "system"]),
      content: z.string().min(1).max(10000),
      timestamp: z.string().nullable().optional(),
    }),
  ).min(1).max(500),
})

/* ------------------------------------------------------------------ */
/*  POST /api/agents/[id]/transcripts                                  */
/*  Store transcript messages (called internally by webhook processor)  */
/*  Auth: INTERNAL_API_SECRET (server-to-server)                        */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth via shared secret (called by webhook, not browser)
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = agentsTranscriptLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const { id: aiAgentId } = await params
    const body = await request.json()
    const parsed = storeTranscriptSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { call_id, agent_id, messages } = parsed.data

    await insertTranscriptMessages(call_id, aiAgentId, agent_id, messages)

    return NextResponse.json({ success: true, count: messages.length })
  } catch (error) {
    console.error("POST /api/agents/[id]/transcripts error:", error)
    return NextResponse.json(
      { error: "Failed to store transcript" },
      { status: 500 },
    )
  }
}
