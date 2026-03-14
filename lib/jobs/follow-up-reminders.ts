import { createClerkClient } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email/resend"
import { sendSms } from "@/lib/sms/send"
import {
  buildFollowUpReminderEmail,
  type FollowUpItem,
} from "@/lib/email/templates/follow-up-reminder"

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

  return report
}
