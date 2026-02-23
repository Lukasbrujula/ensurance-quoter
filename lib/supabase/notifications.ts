/* ------------------------------------------------------------------ */
/*  Notifications Data Access                                          */
/*  Derives notifications from existing data — no dedicated table.     */
/*  Read state tracked via agent_settings.last_notifications_read_at.  */
/* ------------------------------------------------------------------ */

import { createAuthClient } from "./auth-server"
import type { ActivityType } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NotificationType =
  | "ai_agent_lead"
  | "overdue_followup"
  | "upcoming_callback"
  | "status_change"
  | "call"
  | "quote"

export interface Notification {
  id: string
  type: NotificationType
  message: string
  leadId: string | null
  createdAt: string
  read: boolean
}

export interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

/* ------------------------------------------------------------------ */
/*  Activity type → Notification type mapping                          */
/* ------------------------------------------------------------------ */

const ACTIVITY_TYPE_MAP: Partial<Record<ActivityType, NotificationType>> = {
  status_change: "status_change",
  call: "call",
  quote: "quote",
}

/* ------------------------------------------------------------------ */
/*  Main query                                                         */
/* ------------------------------------------------------------------ */

export async function getNotifications(agentId: string): Promise<NotificationsResponse> {
  const supabase = await createAuthClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const oneHourFromNow = new Date(Date.now() + 3600000).toISOString()
  const now = new Date().toISOString()

  const [readAtResult, activitiesResult, overdueResult, upcomingResult, aiCallsResult] =
    await Promise.all([
      // Get last read timestamp
      supabase
        .from("agent_settings")
        .select("last_notifications_read_at")
        .eq("user_id", agentId)
        .maybeSingle(),

      // Recent activities (last 7 days)
      supabase
        .from("activity_logs")
        .select("id, lead_id, activity_type, title, created_at")
        .eq("agent_id", agentId)
        .in("activity_type", ["status_change", "call", "quote"])
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(30),

      // Overdue follow-ups
      supabase
        .from("leads")
        .select("id, first_name, last_name, follow_up_date, source")
        .eq("agent_id", agentId)
        .not("follow_up_date", "is", null)
        .lt("follow_up_date", now)
        .order("follow_up_date", { ascending: true })
        .limit(10),

      // Upcoming callbacks (next 1 hour)
      supabase
        .from("leads")
        .select("id, first_name, last_name, follow_up_date, source")
        .eq("agent_id", agentId)
        .not("follow_up_date", "is", null)
        .gte("follow_up_date", now)
        .lte("follow_up_date", oneHourFromNow)
        .order("follow_up_date", { ascending: true })
        .limit(10),

      // Recent AI agent calls (last 7 days)
      supabase
        .from("ai_agent_calls")
        .select("id, caller_name, caller_phone, created_at, lead_id")
        .eq("agent_id", agentId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20),
    ])

  const lastReadAt =
    (readAtResult.data as Record<string, unknown> | null)?.last_notifications_read_at as string | null
  const readCutoff = lastReadAt ?? new Date(0).toISOString()

  const notifications: Notification[] = []

  // AI agent leads
  for (const call of aiCallsResult.data ?? []) {
    const name = call.caller_name || call.caller_phone || "Unknown caller"
    notifications.push({
      id: `ai-${call.id}`,
      type: "ai_agent_lead",
      message: `${name} called and was handled by your AI agent`,
      leadId: call.lead_id,
      createdAt: call.created_at!,
      read: call.created_at! <= readCutoff,
    })
  }

  // Overdue follow-ups
  for (const lead of overdueResult.data ?? []) {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown"
    notifications.push({
      id: `overdue-${lead.id}`,
      type: "overdue_followup",
      message: `Follow-up with ${name} is overdue`,
      leadId: lead.id,
      createdAt: lead.follow_up_date!,
      read: lead.follow_up_date! <= readCutoff,
    })
  }

  // Upcoming callbacks
  for (const lead of upcomingResult.data ?? []) {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown"
    const dt = new Date(lead.follow_up_date!)
    const timeStr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    notifications.push({
      id: `upcoming-${lead.id}`,
      type: "upcoming_callback",
      message: `Callback with ${name} at ${timeStr}`,
      leadId: lead.id,
      createdAt: lead.follow_up_date!,
      read: false, // upcoming are always "unread"
    })
  }

  // Activity-based notifications
  for (const act of activitiesResult.data ?? []) {
    const type = ACTIVITY_TYPE_MAP[act.activity_type as ActivityType]
    if (!type) continue
    notifications.push({
      id: `act-${act.id}`,
      type,
      message: act.title,
      leadId: act.lead_id,
      createdAt: act.created_at!,
      read: act.created_at! <= readCutoff,
    })
  }

  // Sort by date descending
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Limit to 50
  const trimmed = notifications.slice(0, 50)
  const unreadCount = trimmed.filter((n) => !n.read).length

  return { notifications: trimmed, unreadCount }
}

/* ------------------------------------------------------------------ */
/*  Mark all as read                                                   */
/* ------------------------------------------------------------------ */

export async function markNotificationsRead(agentId: string): Promise<void> {
  const supabase = await createAuthClient()

  // Column added via migration — types not yet regenerated, cast to bypass
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("agent_settings") as any)
    .update({ last_notifications_read_at: new Date().toISOString() })
    .eq("user_id", agentId)

  if (error) {
    throw new Error(`Failed to mark notifications read: ${error.message}`)
  }
}
