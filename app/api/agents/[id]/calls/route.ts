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
import { getAgentCallLogs } from "@/lib/supabase/calls"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* ------------------------------------------------------------------ */
/*  GET /api/agents/[id]/calls — Agent-scoped call logs with extraction */
/* ------------------------------------------------------------------ */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await requireUser()
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    // Verify ownership
    const agent = await getAgent(user.id, id)
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Parse query params
    const url = new URL(request.url)
    const cursor = url.searchParams.get("cursor")
    const limitParam = url.searchParams.get("limit")
    const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 100)

    const calls = await getAgentCallLogs({
      agentId: user.id,
      aiAgentId: id,
      limit,
      cursor,
    })

    // Determine next cursor
    const nextCursor =
      calls.length === limit && calls.length > 0
        ? calls[calls.length - 1]!.started_at
        : null

    return NextResponse.json({ calls, nextCursor })
  } catch (error) {
    console.error(
      "GET /api/agents/[id]/calls error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to load call logs" },
      { status: 500 },
    )
  }
}
