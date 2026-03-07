/* ------------------------------------------------------------------ */
/*  POST /api/auth/google/disconnect — Revoke + delete Google tokens   */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
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
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Get current tokens to revoke with Google
    const tokens = await getGoogleTokens(userId)

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
    await deleteGoogleTokens(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/google/disconnect error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar" },
      { status: 500 },
    )
  }
}
