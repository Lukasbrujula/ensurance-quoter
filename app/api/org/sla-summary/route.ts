import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
import { DEFAULT_SLA_CONFIG } from "@/lib/types/sla"

/**
 * GET /api/org/sla-summary
 *
 * Returns SLA breach counts for the admin's org.
 * Requires auth + orgId + org:admin.
 */
export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const { userId, orgId, orgRole } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!orgId || orgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const supabase = await createClerkSupabaseClient()
    const now = new Date()

    const urgentCutoff = new Date(
      now.getTime() - DEFAULT_SLA_CONFIG.urgent_minutes * 60 * 1000,
    ).toISOString()

    const staleCutoff = new Date(
      now.getTime() - DEFAULT_SLA_CONFIG.stale_hours * 3600 * 1000,
    ).toISOString()

    // UTC-based "start of today" for consistent behavior on Vercel
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString()

    const [urgentRes, staleRes, followUpRes, reassignedRes] =
      await Promise.all([
        // Urgent unassigned: new leads, no agent, older than urgent_minutes
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", "new")
          .is("agent_id", null)
          .lt("created_at", urgentCutoff),

        // Stale: no update in stale_hours, not terminal
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .lt("updated_at", staleCutoff)
          .not("status", "in", '("dead","issued")'),

        // Missed follow-ups: overdue, not terminal
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .not("follow_up_date", "is", null)
          .lt("follow_up_date", now.toISOString())
          .not("status", "in", '("dead","issued")'),

        // Auto-reassigned today (activity logs with SLA mention)
        supabase
          .from("activity_logs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("activity_type", "lead_reassigned")
          .gte("created_at", startOfToday)
          .ilike("title", "%SLA exceeded%"),
      ])

    const queryErrors = [urgentRes, staleRes, followUpRes, reassignedRes]
      .filter((r) => r.error)
      .map((r) => r.error!.message)

    if (queryErrors.length > 0) {
      return NextResponse.json(
        { error: "SLA query errors", details: queryErrors },
        { status: 500 },
      )
    }

    return NextResponse.json({
      urgentUnassigned: urgentRes.count ?? 0,
      staleLeads: staleRes.count ?? 0,
      missedFollowUps: followUpRes.count ?? 0,
      autoReassignedToday: reassignedRes.count ?? 0,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to load SLA summary" },
      { status: 500 },
    )
  }
}
