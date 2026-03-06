import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getAgent } from "@/lib/supabase/ai-agents"
import { getAgentCallDetail } from "@/lib/supabase/calls"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* ------------------------------------------------------------------ */
/*  GET /api/agents/[id]/calls/[callId] — Single call detail           */
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

    if (!UUID_REGEX.test(id) || !UUID_REGEX.test(callId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    // Verify agent ownership
    const agent = await getAgent(user.id, id)
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const detail = await getAgentCallDetail(callId, user.id)
    if (!detail) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    return NextResponse.json({ call: detail })
  } catch (error) {
    console.error(
      "GET /api/agents/[id]/calls/[callId] error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to load call detail" },
      { status: 500 },
    )
  }
}
