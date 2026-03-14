import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
import { checkRateLimit, rateLimiters, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"

/* ------------------------------------------------------------------ */
/*  GET /api/org/unassigned-count                                      */
/*  Returns count of leads with agent_id IS NULL for the active org    */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const supabase = await createClerkSupabaseClient()
    const { count, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .is("agent_id", null)

    if (error) throw error

    return NextResponse.json({ count: count ?? 0 })
  } catch (error) {
    console.error("[org/unassigned-count] Failed:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to count unassigned leads" }, { status: 500 })
  }
}
