/* ------------------------------------------------------------------ */
/*  GET /api/email/status — Check Gmail connection status               */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { isGmailConnected, isGoogleConnected } from "@/lib/supabase/google-integrations"
import { getGmailAddress } from "@/lib/google/gmail-service"

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [gmailConnected, googleConnected] = await Promise.all([
      isGmailConnected(userId),
      isGoogleConnected(userId),
    ])

    let email: string | null = null
    if (gmailConnected) {
      email = await getGmailAddress(userId)
    }

    return NextResponse.json({
      gmailConnected,
      googleConnected,
      email,
    })
  } catch (error) {
    console.error("GET /api/email/status error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { gmailConnected: false, googleConnected: false, email: null },
    )
  }
}
