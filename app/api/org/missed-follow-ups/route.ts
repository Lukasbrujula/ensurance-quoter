import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
import {
  checkRateLimit,
  rateLimiters,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"

/* ------------------------------------------------------------------ */
/*  GET /api/org/missed-follow-ups                                     */
/*  Returns leads with overdue follow-ups and no post-follow-up        */
/*  activity, grouped by agent. Requires auth + orgId + org:admin.     */
/* ------------------------------------------------------------------ */

export interface MissedFollowUpItem {
  leadId: string
  leadName: string
  agentId: string | null
  followUpDate: string
  followUpNote: string | null
  status: string
}

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { userId, orgId, orgRole } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!orgId || orgRole !== "org:admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const supabase = await createClerkSupabaseClient()
    const now = new Date().toISOString()

    // 1. Get overdue follow-up leads in org (exclude dead/issued)
    const { data: overdueLeads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, first_name, last_name, agent_id, follow_up_date, follow_up_note, status")
      .eq("org_id", orgId)
      .not("follow_up_date", "is", null)
      .lt("follow_up_date", now)
      .not("status", "in", '("dead","issued")')
      .order("follow_up_date", { ascending: true })
      .limit(200)

    if (leadsErr) {
      return NextResponse.json(
        { error: "Failed to query leads" },
        { status: 500 },
      )
    }

    if (!overdueLeads || overdueLeads.length === 0) {
      return NextResponse.json({
        success: true,
        data: { items: [], totalCount: 0, byAgent: {} },
      })
    }

    // 2. Check which leads have activity AFTER their follow_up_date
    const leadIds = overdueLeads.map((l) => l.id)
    const earliestFollowUp = overdueLeads[0].follow_up_date!

    const { data: postActivity } = await supabase
      .from("activity_logs")
      .select("lead_id, created_at")
      .in("lead_id", leadIds)
      .gte("created_at", earliestFollowUp)

    const leadsWithPostActivity = new Set<string>()
    for (const act of postActivity ?? []) {
      const lead = overdueLeads.find((l) => l.id === act.lead_id)
      if (lead && act.created_at! > lead.follow_up_date!) {
        leadsWithPostActivity.add(act.lead_id)
      }
    }

    // 3. Filter to truly missed follow-ups
    const items: MissedFollowUpItem[] = overdueLeads
      .filter((lead) => !leadsWithPostActivity.has(lead.id))
      .map((lead) => ({
        leadId: lead.id,
        leadName:
          [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
          "Unknown",
        agentId: lead.agent_id,
        followUpDate: lead.follow_up_date!,
        followUpNote: lead.follow_up_note,
        status: lead.status ?? "new",
      }))

    // 4. Group counts by agent
    const byAgent: Record<string, number> = {}
    for (const item of items) {
      const key = item.agentId ?? "unassigned"
      byAgent[key] = (byAgent[key] ?? 0) + 1
    }

    return NextResponse.json({
      success: true,
      data: { items, totalCount: items.length, byAgent },
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to load missed follow-ups" },
      { status: 500 },
    )
  }
}
