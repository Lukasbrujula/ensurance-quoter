/* ------------------------------------------------------------------ */
/*  POST /api/email/disconnect — Disconnect Gmail (keep Calendar)       */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { setGmailConnected } from "@/lib/supabase/google-integrations"

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only remove gmail_connected flag — preserve Google tokens for Calendar
    await setGmailConnected(userId, false)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/email/disconnect error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to disconnect Gmail" },
      { status: 500 },
    )
  }
}
