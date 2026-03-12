import { z } from "zod"
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
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

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  try {
    const { id: aiAgentId } = await params

    if (!UUID_REGEX.test(aiAgentId)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = storeTranscriptSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { call_id, agent_id, messages } = parsed.data

    // IDOR protection: when accessed via Clerk session (not shared secret),
    // verify the body agent_id matches the authenticated user
    const { userId } = await auth()
    if (userId && agent_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await insertTranscriptMessages(call_id, aiAgentId, agent_id, messages)

    return NextResponse.json({ success: true, count: messages.length })
  } catch (error) {
    console.error("POST /api/agents/[id]/transcripts error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to store transcript" },
      { status: 500 },
    )
  }
}
