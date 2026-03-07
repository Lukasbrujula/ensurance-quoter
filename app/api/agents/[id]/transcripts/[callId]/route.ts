import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getAgent, getTranscriptMessages } from "@/lib/supabase/ai-agents"

/* ------------------------------------------------------------------ */
/*  GET /api/agents/[id]/transcripts/[callId]                          */
/*  Get full transcript for a specific call                            */
/* ------------------------------------------------------------------ */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; callId: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const { id, callId } = await params

    if (!UUID_REGEX.test(id) || !UUID_REGEX.test(callId)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 })
    }

    // Verify agent ownership
    const agent = await getAgent(userId, id)
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const messages = await getTranscriptMessages(userId, callId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("GET /api/agents/[id]/transcripts/[callId] error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to get transcript" },
      { status: 500 },
    )
  }
}
