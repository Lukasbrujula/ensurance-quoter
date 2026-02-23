import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import {
  agentsLimiter,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getAgentUsage } from "@/lib/supabase/ai-agents"

/* ------------------------------------------------------------------ */
/*  GET /api/agents/usage — Aggregated usage across all agents         */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = agentsLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const user = await requireUser()
    const usage = await getAgentUsage(user.id)

    return NextResponse.json(usage)
  } catch (error) {
    console.error("GET /api/agents/usage error:", error)
    return NextResponse.json(
      { error: "Failed to get usage data" },
      { status: 500 },
    )
  }
}
