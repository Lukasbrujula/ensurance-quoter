import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { requireUser } from "@/lib/supabase/auth-server"
import { getConversationPreviews } from "@/lib/supabase/inbox"

/* ------------------------------------------------------------------ */
/*  GET /api/inbox/conversations                                       */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await requireUser()
    const conversations = await getConversationPreviews(user.id)
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("[inbox] GET conversations error:", error)
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  }
}
