/* ------------------------------------------------------------------ */
/*  GET /api/email?leadId=... — Get email logs for a lead              */
/*  POST /api/email/sync — Sync emails from Gmail for a lead           */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getEmailLogs } from "@/lib/supabase/email"

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const leadId = url.searchParams.get("leadId")

    if (!leadId) {
      return NextResponse.json({ error: "leadId required" }, { status: 400 })
    }

    const logs = await getEmailLogs(leadId, userId)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("GET /api/email error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to load emails" }, { status: 500 })
  }
}
