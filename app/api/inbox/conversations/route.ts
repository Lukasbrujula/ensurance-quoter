import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
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
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const conversations = await getConversationPreviews(userId)
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("[inbox] GET conversations error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  }
}
