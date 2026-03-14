/* ------------------------------------------------------------------ */
/*  Lead SLA Job                                                       */
/*  Flags stale/urgent leads and auto-reassigns org leads past SLA.    */
/*  Runs every 15 minutes via Vercel cron.                             */
/* ------------------------------------------------------------------ */

import { createServiceRoleClient } from "@/lib/supabase/server"
import { insertActivityLog } from "@/lib/supabase/activities"
import { DEFAULT_SLA_CONFIG } from "@/lib/types/sla"
import type { DbClient } from "@/lib/supabase/server"

interface SlaReport {
  leadsMarkedUrgent: number
  leadsAutoReassigned: number
  missedFollowUpsMarked: number
  errors: string[]
}

export async function runLeadSla(): Promise<SlaReport> {
  const report: SlaReport = {
    leadsMarkedUrgent: 0,
    leadsAutoReassigned: 0,
    missedFollowUpsMarked: 0,
    errors: [],
  }

  const supabase = createServiceRoleClient()
  const now = new Date()

  /* ── Phase 1: Flag urgent on 'new' leads past urgent_minutes ──── */
  /* Applies to all leads (solo + org) so everyone sees the indicator */
  try {
    const urgentCutoff = new Date(
      now.getTime() - DEFAULT_SLA_CONFIG.urgent_minutes * 60 * 1000,
    ).toISOString()

    const { data: urgentLeads, error: urgentError } = await supabase
      .from("leads")
      .update({ urgent: true, updated_at: now.toISOString() })
      .eq("status", "new")
      .eq("urgent", false)
      .lt("created_at", urgentCutoff)
      .select("id")

    if (urgentError) {
      report.errors.push(`Urgent flagging: ${urgentError.message}`)
    } else {
      report.leadsMarkedUrgent = urgentLeads?.length ?? 0
    }
  } catch (err) {
    report.errors.push(`Urgent flagging threw: ${String(err)}`)
  }

  /* ── Phase 2: Flag urgent on missed follow-ups ──────────────────── */
  /* Leads at any non-terminal status with overdue follow_up_date      */
  try {
    const { data: missedLeads, error: missedError } = await supabase
      .from("leads")
      .update({ urgent: true, updated_at: now.toISOString() })
      .eq("urgent", false)
      .not("follow_up_date", "is", null)
      .lt("follow_up_date", now.toISOString())
      .not("status", "in", '("dead","issued")')
      .select("id")

    if (missedError) {
      report.errors.push(`Missed follow-ups: ${missedError.message}`)
    } else {
      report.missedFollowUpsMarked = missedLeads?.length ?? 0
    }
  } catch (err) {
    report.errors.push(`Missed follow-ups threw: ${String(err)}`)
  }

  /* ── Phase 3: Auto-reassign org leads past auto_reassign_hours ──── */
  /* Only org leads (org_id IS NOT NULL) with an assigned agent         */
  try {
    const reassignCutoff = new Date(
      now.getTime() - DEFAULT_SLA_CONFIG.auto_reassign_hours * 3600 * 1000,
    ).toISOString()

    const { data: reassignLeads, error: reassignQueryError } = await supabase
      .from("leads")
      .select("id, agent_id, org_id, first_name, last_name")
      .eq("status", "new")
      .not("agent_id", "is", null)
      .not("org_id", "is", null)
      .lt("created_at", reassignCutoff)

    if (reassignQueryError) {
      report.errors.push(`Reassign query: ${reassignQueryError.message}`)
    } else if (reassignLeads && reassignLeads.length > 0) {
      for (const lead of reassignLeads) {
        const originalAgentId = lead.agent_id!
        const orgId = lead.org_id!
        const leadName =
          [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
          "Unknown"

        // Guard: only reassign if agent_id hasn't changed since query
        const { data: updated, error: updateError } = await supabase
          .from("leads")
          .update({ agent_id: null, updated_at: now.toISOString() })
          .eq("id", lead.id)
          .eq("agent_id", originalAgentId)
          .select("id")

        if (updateError) {
          report.errors.push(
            `Reassign lead ${lead.id}: ${updateError.message}`,
          )
          continue
        }

        // Lead was claimed by another agent between SELECT and UPDATE — skip
        if (!updated || updated.length === 0) continue

        try {
          await insertActivityLog(
            {
              leadId: lead.id,
              agentId: originalAgentId,
              activityType: "lead_reassigned",
              title: `${leadName} auto-reassigned to pool — SLA exceeded (${DEFAULT_SLA_CONFIG.auto_reassign_hours}h)`,
              orgId,
            },
            supabase as DbClient,
          )
        } catch (logErr) {
          report.errors.push(
            `Activity log for lead ${lead.id}: ${String(logErr)}`,
          )
        }

        report.leadsAutoReassigned++
      }
    }
  } catch (err) {
    report.errors.push(`Auto-reassign threw: ${String(err)}`)
  }

  return report
}
