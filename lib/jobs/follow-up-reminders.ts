import { createClerkClient } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email/resend"
import { sendSms } from "@/lib/sms/send"
import {
  buildFollowUpReminderEmail,
  type FollowUpItem,
} from "@/lib/email/templates/follow-up-reminder"
import {
  buildAdminMissedFollowUpsEmail,
  type MissedFollowUpAgent,
} from "@/lib/email/templates/admin-missed-followups"

/* ------------------------------------------------------------------ */
/*  Follow-up Reminder Job                                             */
/*  Queries leads with follow-ups due/overdue, groups by agent,        */
/*  sends one digest email per agent.                                  */
/* ------------------------------------------------------------------ */

interface ReminderReport {
  agentCount: number
  totalLeads: number
  emailsSent: number
  smsSent: number
  adminEmailsSent: number
  errors: string[]
}

function classifyUrgency(followUpDate: string): "overdue" | "today" | "upcoming" {
  const now = new Date()
  const due = new Date(followUpDate)

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)

  if (due < startOfToday) return "overdue"
  if (due < endOfToday) return "today"
  return "upcoming"
}

export async function runFollowUpReminders(): Promise<ReminderReport> {
  const report: ReminderReport = {
    agentCount: 0,
    totalLeads: 0,
    emailsSent: 0,
    smsSent: 0,
    adminEmailsSent: 0,
    errors: [],
  }

  const supabase = createServiceRoleClient()

  // Get leads with follow-ups due within 1 hour or overdue
  // Exclude dead/issued statuses
  const cutoff = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, first_name, last_name, follow_up_date, follow_up_note, status, agent_id")
    .not("follow_up_date", "is", null)
    .lte("follow_up_date", cutoff)
    .not("status", "in", '("dead","issued")')

  if (leadsError) {
    report.errors.push(`Failed to query leads: ${leadsError.message}`)
    return report
  }

  if (!leads || leads.length === 0) return report

  report.totalLeads = leads.length

  // Group by agent
  const byAgent = new Map<string, typeof leads>()
  for (const lead of leads) {
    if (!lead.agent_id) continue
    const existing = byAgent.get(lead.agent_id) ?? []
    byAgent.set(lead.agent_id, [...existing, lead])
  }

  // Get agent emails via Clerk
  const agentIds = Array.from(byAgent.keys())
  const agentEmails = new Map<string, { email: string; name: string }>()
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

  for (const agentId of agentIds) {
    try {
      const user = await clerk.users.getUser(agentId)
      const email = user.emailAddresses[0]?.emailAddress
      if (email) {
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ") || email
        agentEmails.set(agentId, { email, name })
      }
    } catch {
      report.errors.push(`Failed to resolve Clerk user ${agentId}`)
    }
  }

  report.agentCount = agentEmails.size

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ensurance-quoter.vercel.app"

  // Send one digest per agent
  for (const [agentId, agentLeads] of byAgent) {
    const agent = agentEmails.get(agentId)
    if (!agent) {
      report.errors.push(`No email found for agent ${agentId}`)
      continue
    }

    const items: FollowUpItem[] = agentLeads.map((lead) => ({
      leadId: lead.id,
      leadName:
        [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed Lead",
      followUpDate: lead.follow_up_date!,
      followUpNote: lead.follow_up_note,
      status: lead.status ?? "new",
      urgency: classifyUrgency(lead.follow_up_date!),
    }))

    // Sort: overdue first, then today, then upcoming
    const urgencyOrder = { overdue: 0, today: 1, upcoming: 2 }
    const sortedItems = [...items].sort(
      (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency],
    )

    const overdueCount = sortedItems.filter((i) => i.urgency === "overdue").length
    const todayCount = sortedItems.filter((i) => i.urgency === "today").length

    const subjectLine =
      overdueCount > 0
        ? `${overdueCount} overdue follow-up${overdueCount > 1 ? "s" : ""} need attention`
        : `${todayCount} follow-up${todayCount > 1 ? "s" : ""} due today`

    const html = buildFollowUpReminderEmail({
      agentName: agent.name,
      items: sortedItems,
      appUrl,
    })

    try {
      await sendEmail({
        to: agent.email,
        subject: `Ensurance: ${subjectLine}`,
        html,
      })
      report.emailsSent++
    } catch (error) {
      report.errors.push(
        `Failed to send to ${agent.email}: ${error instanceof Error ? error.message : "Unknown error"}`,
      )
    }
  }

  // ── SMS Phase: send reminder texts to leads with sms_reminder enabled ──
  const smsCutoff = new Date(Date.now() + 45 * 60 * 1000).toISOString()

  const { data: smsLeads, error: smsError } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, follow_up_date, follow_up_note, agent_id")
    .eq("sms_reminder" as string, true)
    .is("sms_reminder_sent_at" as string, null)
    .not("follow_up_date", "is", null)
    .lte("follow_up_date", smsCutoff)
    .not("phone", "is", null)
    .not("status", "in", '("dead","issued")')

  if (smsError) {
    report.errors.push(`Failed to query SMS leads: ${smsError.message}`)
    return report
  }

  if (smsLeads && smsLeads.length > 0) {
    for (const smsLead of smsLeads) {
      const leadName = [smsLead.first_name, smsLead.last_name].filter(Boolean).join(" ") || "there"
      const followUp = smsLead.follow_up_date
        ? new Date(smsLead.follow_up_date).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : ""

      const message = `Hi ${leadName}, just a friendly reminder about your upcoming appointment${followUp ? ` on ${followUp}` : ""}. Looking forward to connecting!`

      const result = await sendSms({
        to: smsLead.phone!,
        message,
        leadId: smsLead.id,
        agentId: smsLead.agent_id!,
        serviceRole: true,
      })

      if (result.success) {
        // Mark as sent so we don't re-send
        await supabase
          .from("leads")
          .update({ sms_reminder_sent_at: new Date().toISOString() } as Record<string, unknown>)
          .eq("id", smsLead.id)
        report.smsSent++
      } else {
        report.errors.push(`SMS to ${smsLead.phone} failed: ${result.error}`)
      }
    }
  }

  // ── Admin Phase: detect missed follow-ups per org and email admins ──
  try {
    const now = new Date()
    const nowIso = now.toISOString()

    // Find distinct org_ids with overdue follow-ups
    const { data: orgLeads, error: orgLeadsError } = await supabase
      .from("leads")
      .select("id, first_name, last_name, follow_up_date, agent_id, org_id")
      .not("org_id", "is", null)
      .not("follow_up_date", "is", null)
      .lt("follow_up_date", nowIso)
      .not("agent_id", "is", null)
      .not("status", "in", '("dead","issued")')
      .order("follow_up_date", { ascending: true })
      .limit(500)

    if (orgLeadsError) {
      report.errors.push(`Admin missed follow-ups query: ${orgLeadsError.message}`)
    } else if (orgLeads && orgLeads.length > 0) {
      // Check for activity after follow_up_date
      const orgLeadIds = orgLeads.map((l) => l.id)
      const earliestFollowUp = orgLeads[0].follow_up_date!

      const { data: postActivity } = await supabase
        .from("activity_logs")
        .select("lead_id, created_at")
        .in("lead_id", orgLeadIds)
        .gte("created_at", earliestFollowUp)

      const leadsWithPostActivity = new Set<string>()
      for (const act of postActivity ?? []) {
        const lead = orgLeads.find((l) => l.id === act.lead_id)
        if (lead && act.created_at! > lead.follow_up_date!) {
          leadsWithPostActivity.add(act.lead_id)
        }
      }

      // Filter to truly missed follow-ups and group by org_id
      const missedByOrg = new Map<string, typeof orgLeads>()
      for (const lead of orgLeads) {
        if (leadsWithPostActivity.has(lead.id)) continue
        const existing = missedByOrg.get(lead.org_id!) ?? []
        missedByOrg.set(lead.org_id!, [...existing, lead])
      }

      // For each org with missed follow-ups, find admins and send digest
      for (const [orgIdVal, missedLeads] of missedByOrg) {
        // Group by agent within this org
        const byAgent = new Map<string, typeof missedLeads>()
        for (const lead of missedLeads) {
          const existing = byAgent.get(lead.agent_id!) ?? []
          byAgent.set(lead.agent_id!, [...existing, lead])
        }

        // Resolve agent names
        const agentSections: MissedFollowUpAgent[] = []
        for (const [agentIdVal, agentLeads] of byAgent) {
          let agentName = "Unknown Agent"
          try {
            const user = await clerk.users.getUser(agentIdVal)
            agentName =
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.emailAddresses[0]?.emailAddress ||
              "Unknown Agent"
          } catch {
            // Use fallback name
          }
          agentSections.push({
            agentName,
            leads: agentLeads.map((l) => ({
              leadId: l.id,
              leadName:
                [l.first_name, l.last_name].filter(Boolean).join(" ") ||
                "Unnamed Lead",
              followUpDate: l.follow_up_date!,
            })),
          })
        }

        // Find org admins via Clerk
        try {
          const orgMembers = await clerk.organizations.getOrganizationMembershipList({
            organizationId: orgIdVal,
            limit: 50,
          })

          const admins = orgMembers.data.filter(
            (m) => m.role === "org:admin" && m.publicUserData?.userId,
          )

          for (const admin of admins) {
            const adminUserId = admin.publicUserData!.userId!
            try {
              const adminUser = await clerk.users.getUser(adminUserId)
              const adminEmail = adminUser.emailAddresses[0]?.emailAddress
              if (!adminEmail) continue

              const adminName =
                [adminUser.firstName, adminUser.lastName].filter(Boolean).join(" ") ||
                adminEmail

              const totalCount = missedLeads.length
              const html = buildAdminMissedFollowUpsEmail({
                adminName,
                agents: agentSections,
                totalCount,
                appUrl,
              })

              await sendEmail({
                to: adminEmail,
                subject: `Ensurance: ${totalCount} missed follow-up${totalCount === 1 ? "" : "s"} across your team`,
                html,
              })
              report.adminEmailsSent++
            } catch (adminErr) {
              report.errors.push(
                `Admin email for org ${orgIdVal}: ${adminErr instanceof Error ? adminErr.message : String(adminErr)}`,
              )
            }
          }
        } catch (orgErr) {
          report.errors.push(
            `Clerk org lookup for ${orgIdVal}: ${orgErr instanceof Error ? orgErr.message : String(orgErr)}`,
          )
        }
      }
    }
  } catch (err) {
    report.errors.push(`Admin missed follow-ups phase: ${err instanceof Error ? err.message : String(err)}`)
  }

  return report
}
