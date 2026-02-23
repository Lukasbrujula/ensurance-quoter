import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
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

  try {
    const user = await requireUser()
    const { id, callId } = await params

    // Verify agent ownership
    const agent = await getAgent(user.id, id)
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const messages = await getTranscriptMessages(user.id, callId)

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("GET /api/agents/[id]/transcripts/[callId] error:", error)
    return NextResponse.json(
      { error: "Failed to get transcript" },
      { status: 500 },
    )
  }
}
