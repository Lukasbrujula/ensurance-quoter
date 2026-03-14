/**
 * Tool definitions for the Agency Management Assistant.
 *
 * These tools let the LLM query real agency data — team stats,
 * agent activity, stale leads, overdue follow-ups, and unassigned leads.
 */

import { z } from "zod"
import { tool } from "ai"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
import {
  getDashboardStatsByOrg,
  getDashboardStatsTeamBreakdown,
} from "@/lib/supabase/dashboard"

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function formatLeadName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown"
}

function daysAgo(dateStr: string): number {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  )
}

/* ------------------------------------------------------------------ */
/*  Tool factory — closes over orgId + agentNames                      */
/* ------------------------------------------------------------------ */

export function createAgencyTools(
  orgId: string,
  agentNames: Map<string, string>,
) {
  function agentName(agentId: string | null): string {
    if (!agentId) return "Unassigned"
    return agentNames.get(agentId) ?? agentId.slice(0, 8)
  }

  /* ---- get_team_stats ---- */

  async function executeGetTeamStats(): Promise<string> {
    try {
      const [stats, breakdown] = await Promise.all([
        getDashboardStatsByOrg(orgId),
        getDashboardStatsTeamBreakdown(orgId),
      ])

      const lines: string[] = [
        "## Team Overview",
        "",
        `- **Total leads**: ${stats.leads.total}`,
        `- **New leads this week**: ${stats.leads.thisWeek}`,
        `- **Calls this week**: ${stats.calls.thisWeek}`,
        `- **Calls this month**: ${stats.calls.thisMonth}`,
        `- **Close rate**: ${stats.closeRate}%`,
        "",
        "### Pipeline Breakdown",
        "",
      ]

      for (const [status, count] of Object.entries(stats.leads.byStatus)) {
        lines.push(`- ${status}: ${count}`)
      }

      if (breakdown.length > 0) {
        lines.push("", "### Per-Agent Breakdown", "")
        lines.push(
          "| Agent | Total Leads | New This Week | Calls | Quotes |",
          "|-------|------------|---------------|-------|--------|",
        )
        for (const b of breakdown) {
          lines.push(
            `| ${agentName(b.agentId)} | ${b.leadCount} | ${b.leadsThisWeek} | ${b.callCount} | ${b.quoteCount} |`,
          )
        }
      }

      if (stats.upcomingFollowUps.length > 0) {
        lines.push("", "### Upcoming Follow-ups", "")
        for (const fu of stats.upcomingFollowUps.slice(0, 10)) {
          const dt = new Date(fu.followUpDate)
          const dateStr = dt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
          lines.push(`- **${fu.leadName}** — ${dateStr}${fu.followUpNote ? ` (${fu.followUpNote})` : ""}`)
        }
      }

      return lines.join("\n")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      return `Failed to fetch team stats: ${msg}`
    }
  }

  /* ---- get_agent_activity ---- */

  const agentActivitySchema = z.object({
    agent_id: z
      .string()
      .optional()
      .describe("Specific agent ID to query. Omit for all agents."),
    days: z
      .number()
      .int()
      .min(1)
      .max(90)
      .default(7)
      .describe("Number of days to look back (default 7)"),
  })

  async function executeGetAgentActivity(
    params: z.infer<typeof agentActivitySchema>,
  ): Promise<string> {
    try {
      const supabase = await createClerkSupabaseClient()
      const since = new Date(
        Date.now() - params.days * 24 * 60 * 60 * 1000,
      ).toISOString()

      let query = supabase
        .from("activity_logs")
        .select("id, agent_id, activity_type, created_at")
        .eq("org_id", orgId)
        .gte("created_at", since)

      if (params.agent_id) {
        query = query.eq("agent_id", params.agent_id)
      }

      const { data: rows, error } = await query.order("created_at", {
        ascending: false,
      })

      if (error) return `Failed to fetch activity: ${error.message}`

      const activities = rows ?? []

      if (activities.length === 0) {
        return params.agent_id
          ? `No activity found for ${agentName(params.agent_id)} in the last ${params.days} days.`
          : `No team activity found in the last ${params.days} days.`
      }

      // Group by agent, then by activity type
      const byAgent = new Map<
        string,
        { counts: Map<string, number>; lastActive: string }
      >()

      for (const row of activities) {
        const aid = row.agent_id ?? "unassigned"
        if (!byAgent.has(aid)) {
          byAgent.set(aid, { counts: new Map(), lastActive: row.created_at! })
        }
        const entry = byAgent.get(aid)!
        const type = row.activity_type
        entry.counts.set(type, (entry.counts.get(type) ?? 0) + 1)
        if (row.created_at! > entry.lastActive) {
          entry.lastActive = row.created_at!
        }
      }

      const lines: string[] = [
        `## Agent Activity (last ${params.days} days)`,
        "",
      ]

      for (const [aid, data] of byAgent) {
        const name = agentName(aid === "unassigned" ? null : aid)
        const lastDt = new Date(data.lastActive)
        const lastStr = lastDt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
        lines.push(`### ${name}`)
        lines.push(`Last active: ${lastStr}`)
        lines.push("")

        const sortedTypes = [...data.counts.entries()].sort(
          (a, b) => b[1] - a[1],
        )
        for (const [type, count] of sortedTypes) {
          lines.push(`- ${type}: ${count}`)
        }
        lines.push("")
      }

      return lines.join("\n")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      return `Failed to fetch agent activity: ${msg}`
    }
  }

  /* ---- get_stale_leads ---- */

  async function executeGetStaleLeads(): Promise<string> {
    try {
      const supabase = await createClerkSupabaseClient()
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      // Get leads with no recent activity
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("id, first_name, last_name, agent_id, status, created_at, updated_at")
        .eq("org_id", orgId)
        .not("status", "in", '("dead","issued")')
        .lt("updated_at", cutoff)
        .order("updated_at", { ascending: true })
        .limit(50)

      if (leadsError) return `Failed to fetch leads: ${leadsError.message}`

      const staleLeads = leads ?? []
      if (staleLeads.length === 0) {
        return "No stale leads found. All leads have been updated within the last 24 hours."
      }

      // Check activity logs for these leads
      const leadIds = staleLeads.map((l) => l.id)
      const { data: recentActivity } = await supabase
        .from("activity_logs")
        .select("lead_id, created_at")
        .in("lead_id", leadIds)
        .gte("created_at", cutoff)

      const activeLeadIds = new Set(
        (recentActivity ?? []).map((a) => a.lead_id),
      )

      // Filter to truly stale leads (no activity in 24h)
      const trulyStale = staleLeads.filter((l) => !activeLeadIds.has(l.id))

      if (trulyStale.length === 0) {
        return "No stale leads found. All leads have had recent activity."
      }

      // Group by agent
      const byAgent = new Map<string, typeof trulyStale>()
      for (const lead of trulyStale) {
        const key = lead.agent_id ?? "unassigned"
        if (!byAgent.has(key)) byAgent.set(key, [])
        byAgent.get(key)!.push(lead)
      }

      const lines: string[] = [
        `## Stale Leads (${trulyStale.length} with no activity in 24+ hours)`,
        "",
      ]

      for (const [aid, agentLeads] of byAgent) {
        const name = agentName(aid === "unassigned" ? null : aid)
        lines.push(`### ${name} (${agentLeads.length} stale)`)
        lines.push("")
        for (const lead of agentLeads.slice(0, 10)) {
          const leadName = formatLeadName(lead.first_name, lead.last_name)
          const staleDays = daysAgo(lead.updated_at!)
          lines.push(
            `- **${leadName}** — status: ${lead.status ?? "new"}, last updated ${staleDays} day${staleDays !== 1 ? "s" : ""} ago`,
          )
        }
        if (agentLeads.length > 10) {
          lines.push(`- ... and ${agentLeads.length - 10} more`)
        }
        lines.push("")
      }

      return lines.join("\n")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      return `Failed to fetch stale leads: ${msg}`
    }
  }

  /* ---- get_overdue_followups ---- */

  async function executeGetOverdueFollowups(): Promise<string> {
    try {
      const supabase = await createClerkSupabaseClient()
      const now = new Date().toISOString()

      const { data: leads, error } = await supabase
        .from("leads")
        .select(
          "id, first_name, last_name, agent_id, follow_up_date, follow_up_note, status",
        )
        .eq("org_id", orgId)
        .not("follow_up_date", "is", null)
        .lt("follow_up_date", now)
        .not("status", "in", '("dead","issued")')
        .order("follow_up_date", { ascending: true })
        .limit(50)

      if (error) return `Failed to fetch overdue follow-ups: ${error.message}`

      const overdue = leads ?? []
      if (overdue.length === 0) {
        return "No overdue follow-ups found. Team is on track."
      }

      // Check for post-followup activity
      const leadIds = overdue.map((l) => l.id)
      const earliestFollowUp = overdue[0].follow_up_date!
      const { data: postActivity } = await supabase
        .from("activity_logs")
        .select("lead_id, created_at")
        .in("lead_id", leadIds)
        .gte("created_at", earliestFollowUp)

      const leadsWithActivity = new Set<string>()
      for (const act of postActivity ?? []) {
        const lead = overdue.find((l) => l.id === act.lead_id)
        if (lead && act.created_at! > lead.follow_up_date!) {
          leadsWithActivity.add(act.lead_id)
        }
      }

      // Filter to truly missed follow-ups
      const missed = overdue.filter((l) => !leadsWithActivity.has(l.id))

      if (missed.length === 0) {
        return "All overdue follow-ups have had subsequent activity. No action needed."
      }

      // Group by agent
      const byAgent = new Map<string, typeof missed>()
      for (const lead of missed) {
        const key = lead.agent_id ?? "unassigned"
        if (!byAgent.has(key)) byAgent.set(key, [])
        byAgent.get(key)!.push(lead)
      }

      const lines: string[] = [
        `## Overdue Follow-ups (${missed.length} missed)`,
        "",
      ]

      for (const [aid, agentLeads] of byAgent) {
        const name = agentName(aid === "unassigned" ? null : aid)
        lines.push(`### ${name} (${agentLeads.length} overdue)`)
        lines.push("")
        for (const lead of agentLeads.slice(0, 10)) {
          const leadName = formatLeadName(lead.first_name, lead.last_name)
          const overdueDays = daysAgo(lead.follow_up_date!)
          const note = lead.follow_up_note ? ` — "${lead.follow_up_note}"` : ""
          lines.push(
            `- **${leadName}** — ${overdueDays} day${overdueDays !== 1 ? "s" : ""} overdue${note}`,
          )
        }
        if (agentLeads.length > 10) {
          lines.push(`- ... and ${agentLeads.length - 10} more`)
        }
        lines.push("")
      }

      return lines.join("\n")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      return `Failed to fetch overdue follow-ups: ${msg}`
    }
  }

  /* ---- get_unassigned_leads ---- */

  async function executeGetUnassignedLeads(): Promise<string> {
    try {
      const supabase = await createClerkSupabaseClient()

      const { data: leads, error } = await supabase
        .from("leads")
        .select("id, first_name, last_name, status, source, created_at")
        .eq("org_id", orgId)
        .is("agent_id", null)
        .not("status", "in", '("dead","issued")')
        .order("created_at", { ascending: true })
        .limit(50)

      if (error) return `Failed to fetch unassigned leads: ${error.message}`

      const unassigned = leads ?? []
      if (unassigned.length === 0) {
        return "No unassigned leads in the pool. All leads are assigned to agents."
      }

      const lines: string[] = [
        `## Unassigned Leads (${unassigned.length} in pool)`,
        "",
        "| Lead | Status | Source | Waiting |",
        "|------|--------|--------|---------|",
      ]

      for (const lead of unassigned) {
        const name = formatLeadName(lead.first_name, lead.last_name)
        const waitingDays = daysAgo(lead.created_at!)
        lines.push(
          `| ${name} | ${lead.status ?? "new"} | ${lead.source ?? "unknown"} | ${waitingDays} day${waitingDays !== 1 ? "s" : ""} |`,
        )
      }

      return lines.join("\n")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      return `Failed to fetch unassigned leads: ${msg}`
    }
  }

  /* ---- Tool definitions ---- */

  return {
    get_team_stats: tool({
      description:
        "Get overall team performance stats including total leads, calls, close rate, pipeline breakdown, and per-agent metrics. Use this for performance summaries, weekly reviews, or workload analysis.",
      inputSchema: z.object({}),
      execute: executeGetTeamStats,
    }),

    get_agent_activity: tool({
      description:
        "Get activity history for a specific agent or all agents. Shows counts by activity type (calls, quotes, notes, etc.) and last active time. Use this to compare agent productivity or check individual performance.",
      inputSchema: agentActivitySchema,
      execute: executeGetAgentActivity,
    }),

    get_stale_leads: tool({
      description:
        "Find leads with no activity in the last 24+ hours. Returns leads grouped by agent. Use this to identify leads at risk of going cold.",
      inputSchema: z.object({}),
      execute: executeGetStaleLeads,
    }),

    get_overdue_followups: tool({
      description:
        "Find leads with follow-up dates in the past that have not had subsequent activity. Grouped by agent. Use this to hold agents accountable for follow-up commitments.",
      inputSchema: z.object({}),
      execute: executeGetOverdueFollowups,
    }),

    get_unassigned_leads: tool({
      description:
        "Get all leads in the unassigned pool (agent_id is NULL). Shows how long each has been waiting. Use this to help the admin decide lead distribution.",
      inputSchema: z.object({}),
      execute: executeGetUnassignedLeads,
    }),
  }
}
