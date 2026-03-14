/* ------------------------------------------------------------------ */
/*  Dashboard Data Access                                              */
/* ------------------------------------------------------------------ */

import { createClerkSupabaseClient } from "./clerk-client"
import type { ActivityLog, ActivityType } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  leads: {
    total: number
    thisWeek: number
    byStatus: Record<string, number>
  }
  calls: {
    thisWeek: number
    thisMonth: number
  }
  closeRate: number
  upcomingFollowUps: FollowUpItem[]
  recentActivity: ActivityLog[]
}

export interface FollowUpItem {
  leadId: string
  leadName: string
  followUpDate: string
  followUpNote: string | null
  source: string | null
}

/* ------------------------------------------------------------------ */
/*  Main query                                                         */
/* ------------------------------------------------------------------ */

export async function getDashboardStats(agentId: string): Promise<DashboardStats> {
  const supabase = await createClerkSupabaseClient()

  const now = new Date()
  const startOfWeek = getStartOfWeek(now)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    leadsResult,
    weekLeadsResult,
    callsWeekResult,
    callsMonthResult,
    followUpsResult,
    activityResult,
  ] = await Promise.all([
    // Total leads + status breakdown
    supabase
      .from("leads")
      .select("id, status")
      .eq("agent_id", agentId),

    // Leads created this week
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .gte("created_at", startOfWeek.toISOString()),

    // Calls this week
    supabase
      .from("call_logs")
      .select("id, leads!inner(agent_id)", { count: "exact", head: true })
      .eq("leads.agent_id", agentId)
      .gte("started_at", startOfWeek.toISOString()),

    // Calls this month
    supabase
      .from("call_logs")
      .select("id, leads!inner(agent_id)", { count: "exact", head: true })
      .eq("leads.agent_id", agentId)
      .gte("started_at", startOfMonth.toISOString()),

    // Upcoming follow-ups (next 7 days)
    supabase
      .from("leads")
      .select("id, first_name, last_name, follow_up_date, follow_up_note, source")
      .eq("agent_id", agentId)
      .not("follow_up_date", "is", null)
      .lte("follow_up_date", sevenDaysFromNow.toISOString())
      .order("follow_up_date", { ascending: true })
      .limit(20),

    // Recent activity (last 10)
    supabase
      .from("activity_logs")
      .select("*")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  // Process leads data
  const allLeads = leadsResult.data ?? []
  const byStatus: Record<string, number> = {}
  for (const lead of allLeads) {
    const status = lead.status ?? "new"
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }

  // Close rate: issued / (quoted + applied + issued + dead)
  const denominator =
    (byStatus["quoted"] ?? 0) +
    (byStatus["applied"] ?? 0) +
    (byStatus["issued"] ?? 0) +
    (byStatus["dead"] ?? 0)
  const closeRate =
    denominator > 0
      ? Math.round(((byStatus["issued"] ?? 0) / denominator) * 100)
      : 0

  // Format follow-ups
  const upcomingFollowUps: FollowUpItem[] = (followUpsResult.data ?? []).map((row) => ({
    leadId: row.id,
    leadName: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown",
    followUpDate: row.follow_up_date!,
    followUpNote: row.follow_up_note,
    source: row.source,
  }))

  // Format activities
  const recentActivity: ActivityLog[] = (activityResult.data ?? []).map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    agentId: row.agent_id,
    activityType: row.activity_type as ActivityType,
    title: row.title,
    details: row.details as Record<string, unknown> | null,
    createdAt: row.created_at!,
  }))

  return {
    leads: {
      total: allLeads.length,
      thisWeek: weekLeadsResult.count ?? 0,
      byStatus,
    },
    calls: {
      thisWeek: callsWeekResult.count ?? 0,
      thisMonth: callsMonthResult.count ?? 0,
    },
    closeRate,
    upcomingFollowUps,
    recentActivity,
  }
}

/* ------------------------------------------------------------------ */
/*  Team-scoped query (org)                                            */
/* ------------------------------------------------------------------ */

export async function getDashboardStatsByOrg(orgId: string): Promise<DashboardStats> {
  const supabase = await createClerkSupabaseClient()

  const now = new Date()
  const startOfWeek = getStartOfWeek(now)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    leadsResult,
    weekLeadsResult,
    callsWeekResult,
    callsMonthResult,
    followUpsResult,
    activityResult,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, status")
      .eq("org_id", orgId),

    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", startOfWeek.toISOString()),

    supabase
      .from("call_logs")
      .select("id, leads!inner(org_id)", { count: "exact", head: true })
      .eq("leads.org_id", orgId)
      .gte("started_at", startOfWeek.toISOString()),

    supabase
      .from("call_logs")
      .select("id, leads!inner(org_id)", { count: "exact", head: true })
      .eq("leads.org_id", orgId)
      .gte("started_at", startOfMonth.toISOString()),

    supabase
      .from("leads")
      .select("id, first_name, last_name, follow_up_date, follow_up_note, source")
      .eq("org_id", orgId)
      .not("follow_up_date", "is", null)
      .lte("follow_up_date", sevenDaysFromNow.toISOString())
      .order("follow_up_date", { ascending: true })
      .limit(20),

    supabase
      .from("activity_logs")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const allLeads = leadsResult.data ?? []
  const byStatus: Record<string, number> = {}
  for (const lead of allLeads) {
    const status = lead.status ?? "new"
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }

  const denominator =
    (byStatus["quoted"] ?? 0) +
    (byStatus["applied"] ?? 0) +
    (byStatus["issued"] ?? 0) +
    (byStatus["dead"] ?? 0)
  const closeRate =
    denominator > 0
      ? Math.round(((byStatus["issued"] ?? 0) / denominator) * 100)
      : 0

  const upcomingFollowUps: FollowUpItem[] = (followUpsResult.data ?? []).map((row) => ({
    leadId: row.id,
    leadName: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Unknown",
    followUpDate: row.follow_up_date!,
    followUpNote: row.follow_up_note,
    source: row.source,
  }))

  const recentActivity: ActivityLog[] = (activityResult.data ?? []).map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    agentId: row.agent_id,
    activityType: row.activity_type as ActivityType,
    title: row.title,
    details: row.details as Record<string, unknown> | null,
    createdAt: row.created_at!,
  }))

  return {
    leads: {
      total: allLeads.length,
      thisWeek: weekLeadsResult.count ?? 0,
      byStatus,
    },
    calls: {
      thisWeek: callsWeekResult.count ?? 0,
      thisMonth: callsMonthResult.count ?? 0,
    },
    closeRate,
    upcomingFollowUps,
    recentActivity,
  }
}

/* ------------------------------------------------------------------ */
/*  Team breakdown (per-agent stats within an org)                     */
/* ------------------------------------------------------------------ */

export interface AgentBreakdownItem {
  agentId: string
  leadCount: number
  leadsThisWeek: number
  callCount: number
  quoteCount: number
}

export async function getDashboardStatsTeamBreakdown(
  orgId: string,
): Promise<AgentBreakdownItem[]> {
  const supabase = await createClerkSupabaseClient()

  const now = new Date()
  const startOfWeek = getStartOfWeek(now)

  const [leadsResult, weekLeadsResult, callsResult, quotesResult] =
    await Promise.all([
      // All leads in org with agent_id
      supabase
        .from("leads")
        .select("id, agent_id")
        .eq("org_id", orgId),

      // Leads created this week with agent_id
      supabase
        .from("leads")
        .select("id, agent_id")
        .eq("org_id", orgId)
        .gte("created_at", startOfWeek.toISOString()),

      // Calls joined through leads
      supabase
        .from("call_logs")
        .select("id, leads!inner(agent_id, org_id)")
        .eq("leads.org_id", orgId),

      // Quotes joined through leads
      supabase
        .from("quotes")
        .select("id, leads!inner(agent_id, org_id)")
        .eq("leads.org_id", orgId),
    ])

  // Build per-agent map
  const agentMap = new Map<
    string,
    { leadCount: number; leadsThisWeek: number; callCount: number; quoteCount: number }
  >()

  const ensureAgent = (agentId: string | null) => {
    if (!agentId) return
    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, { leadCount: 0, leadsThisWeek: 0, callCount: 0, quoteCount: 0 })
    }
  }

  for (const row of leadsResult.data ?? []) {
    ensureAgent(row.agent_id)
    if (row.agent_id) {
      agentMap.get(row.agent_id)!.leadCount += 1
    }
  }

  for (const row of weekLeadsResult.data ?? []) {
    ensureAgent(row.agent_id)
    if (row.agent_id) {
      agentMap.get(row.agent_id)!.leadsThisWeek += 1
    }
  }

  for (const row of callsResult.data ?? []) {
    const leads = row.leads as unknown as { agent_id: string | null }
    ensureAgent(leads.agent_id)
    if (leads.agent_id) {
      agentMap.get(leads.agent_id)!.callCount += 1
    }
  }

  for (const row of quotesResult.data ?? []) {
    const leads = row.leads as unknown as { agent_id: string | null }
    ensureAgent(leads.agent_id)
    if (leads.agent_id) {
      agentMap.get(leads.agent_id)!.quoteCount += 1
    }
  }

  // Convert to array, sort by leadsThisWeek desc
  const breakdown: AgentBreakdownItem[] = []
  for (const [agentId, data] of agentMap) {
    breakdown.push({ agentId, ...data })
  }
  breakdown.sort((a, b) => b.leadsThisWeek - a.leadsThisWeek)

  return breakdown
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday = start of week
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
