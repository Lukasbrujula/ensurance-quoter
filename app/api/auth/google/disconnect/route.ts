/* ------------------------------------------------------------------ */
/*  POST /api/auth/google/disconnect — Revoke + delete Google tokens   */
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
import { getOAuth2Client } from "@/lib/google/oauth"
import {
  getGoogleTokens,
  deleteGoogleTokens,
} from "@/lib/supabase/google-integrations"

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.auth, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await requireUser()

    // Get current tokens to revoke with Google
    const tokens = await getGoogleTokens(user.id)

    if (tokens) {
      // Best-effort revocation with Google
      try {
        const client = getOAuth2Client()
        if (client) {
          await client.revokeToken(tokens.accessToken)
        }
      } catch {
        // Revocation failure is non-critical — tokens will expire naturally
      }
    }

    // Delete from our database
    await deleteGoogleTokens(user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/google/disconnect error:", error)
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar" },
      { status: 500 },
    )
  }
}
