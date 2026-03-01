/* ------------------------------------------------------------------ */
/*  GET /api/auth/google — Initiate Google OAuth redirect              */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { generateAuthUrl, isGoogleConfigured } from "@/lib/google/oauth"

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.auth, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: "Google Calendar is not configured on this server" },
        { status: 503 },
      )
    }

    const user = await requireUser()

    // Accept optional returnTo query param (must be a local path)
    const reqUrl = new URL(request.url)
    const returnTo = reqUrl.searchParams.get("returnTo")
    const safeReturnTo = returnTo?.startsWith("/") ? returnTo : undefined

    const authUrl = generateAuthUrl(user.id, safeReturnTo)

    if (!authUrl) {
      return NextResponse.json(
        { error: "Failed to generate Google auth URL" },
        { status: 500 },
      )
    }

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("GET /api/auth/google error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to initiate Google OAuth" },
      { status: 500 },
    )
  }
}
