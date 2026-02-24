/* ------------------------------------------------------------------ */
/*  GET /api/auth/google/callback — Handle Google OAuth redirect       */
/*  Exchanges code for tokens, fetches user email, stores in DB.       */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { google } from "googleapis"
import { exchangeCodeForTokens, getOAuth2Client, parseOAuthState } from "@/lib/google/oauth"
import { storeGoogleTokens } from "@/lib/supabase/google-integrations"
import { getCurrentUser } from "@/lib/supabase/auth-server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"

export async function GET(request: Request) {
  const rl = await checkRateLimit(rateLimiters.auth, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const stateParam = url.searchParams.get("state")
  const errorParam = url.searchParams.get("error")

  // Parse state to extract userId and optional returnTo
  const { userId: stateUserId, returnTo } = stateParam
    ? parseOAuthState(stateParam)
    : { userId: "", returnTo: undefined }

  // Redirect destination: returnTo path or default settings page
  const redirectPath = returnTo || "/settings/integrations"
  const redirectBase = new URL(redirectPath, request.url)

  // User denied consent
  if (errorParam) {
    redirectBase.searchParams.set("google", "cancelled")
    return NextResponse.redirect(redirectBase)
  }

  if (!code || !stateParam) {
    redirectBase.searchParams.set("google", "error")
    return NextResponse.redirect(redirectBase)
  }

  try {
    // Validate state matches the authenticated user
    const user = await getCurrentUser()
    if (!user || user.id !== stateUserId) {
      redirectBase.searchParams.set("google", "error")
      return NextResponse.redirect(redirectBase)
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      redirectBase.searchParams.set("google", "error")
      return NextResponse.redirect(redirectBase)
    }

    // Fetch the user's email from Google
    let email: string | null = null
    try {
      const oauth2Client = getOAuth2Client()
      if (oauth2Client) {
        oauth2Client.setCredentials({ access_token: tokens.access_token })
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
        const userInfo = await oauth2.userinfo.get()
        email = userInfo.data.email ?? null
      }
    } catch {
      // Non-critical — proceed without email
    }

    // Store tokens in database
    await storeGoogleTokens(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
      email,
    })

    redirectBase.searchParams.set("google", "connected")
    return NextResponse.redirect(redirectBase)
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    redirectBase.searchParams.set("google", "error")
    return NextResponse.redirect(redirectBase)
  }
}
