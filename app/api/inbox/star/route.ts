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
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const starSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
})

/* ------------------------------------------------------------------ */
/*  POST /api/inbox/star — Toggle starred flag on a lead               */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = starSchema.safeParse(body)
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

    const supabase = await createClerkSupabaseClient()
    const { leadId } = parsed.data

    // Read current starred value
    const { data: lead, error: readError } = await supabase
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("agent_id", userId)
      .single()

    if (readError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const currentStarred = (lead as Record<string, unknown>).starred as boolean ?? false
    const newStarred = !currentStarred

    // Cast update to bypass generated type constraint (columns not yet in generated types)
    const { error: updateError } = await supabase
      .from("leads")
      .update({ starred: newStarred, updated_at: new Date().toISOString() } as Record<string, unknown>)
      .eq("id", leadId)
      .eq("agent_id", userId)

    if (updateError) {
      throw new Error(`Failed to update starred: ${updateError.message}`)
    }

    return NextResponse.json({ success: true, starred: newStarred })
  } catch (error) {
    console.error(
      "[inbox/star] POST error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to toggle star" },
      { status: 500 },
    )
  }
}
