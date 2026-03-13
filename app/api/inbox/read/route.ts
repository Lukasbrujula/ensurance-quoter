import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
import { markSmsRead, markSmsUnread, markAllSmsRead } from "@/lib/supabase/sms"
import { markEmailsRead, markAllEmailsRead } from "@/lib/supabase/email"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const markReadSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
  action: z.enum(["read", "unread"]),
})

const markAllSchema = z.object({
  action: z.literal("read_all"),
})

const requestSchema = z.union([markReadSchema, markAllSchema])

/* ------------------------------------------------------------------ */
/*  POST /api/inbox/read                                               */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = parsed.data

    if ("leadId" in data) {
      if (data.action === "read") {
        await Promise.all([
          markSmsRead(data.leadId, userId),
          markEmailsRead(data.leadId, userId),
        ])
      } else {
        await markSmsUnread(data.leadId, userId)
      }
    } else {
      await Promise.all([
        markAllSmsRead(userId),
        markAllEmailsRead(userId),
      ])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(
      "[inbox/read] POST error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to update read status" },
      { status: 500 },
    )
  }
}
