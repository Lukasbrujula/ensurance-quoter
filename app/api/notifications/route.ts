import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
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
    const user = await requireUser()
    const data = await getNotifications(user.id)
    return NextResponse.json(data)
  } catch (error) {
    console.error("GET /api/notifications error:", error)
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
    const user = await requireUser()
    await markNotificationsRead(user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/notifications error:", error)
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 },
    )
  }
}
