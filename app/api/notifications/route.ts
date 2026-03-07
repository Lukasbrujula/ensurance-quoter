import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getNotifications, markNotificationsRead } from "@/lib/supabase/notifications"

/* ------------------------------------------------------------------ */
/*  GET /api/notifications                                             */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const data = await getNotifications(userId)
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/notifications error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/notifications — Mark all as read                         */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    await markNotificationsRead(userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/notifications error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 },
    )
  }
}
