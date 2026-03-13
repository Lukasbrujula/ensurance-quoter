import { createClerkSupabaseClient } from "./clerk-client"
import { getUnreadCounts } from "./sms"
import type { LeadStatus } from "@/lib/types/lead"
import type { LeadSource } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type InboxChannel = "sms" | "email"

export interface ConversationPreview {
  leadId: string
  leadName: string
  phone: string | null
  email: string | null
  state: string | null
  status: LeadStatus
  source: LeadSource
  lastMessage: string | null
  lastMessageAt: string | null
  lastMessageType: "sms" | "email" | "call" | null
  hasHistory: boolean
  unreadCount: number
  createdAt: string
}

/* ------------------------------------------------------------------ */
/*  Data access                                                        */
/* ------------------------------------------------------------------ */

export async function getConversationPreviews(
  agentId: string,
): Promise<ConversationPreview[]> {
  const supabase = await createClerkSupabaseClient()

  // Fetch ALL leads for the agent
  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, email, state, status, source, created_at")
    .eq("agent_id", agentId)

  if (leadError || !leads || leads.length === 0) return []

  const leadIds = leads.map((l) => l.id)

  // Fetch unread counts per lead
  const unreadCountMap = await getUnreadCounts(agentId)

  // Fetch most recent SMS log per lead
  const { data: smsLogs } = await supabase
    .from("sms_logs")
    .select("lead_id, message, created_at, direction")
    .eq("agent_id", agentId)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false })

  // Fetch most recent communication-type activities per lead
  const { data: activities } = await supabase
    .from("activity_logs")
    .select("lead_id, title, created_at, activity_type")
    .eq("agent_id", agentId)
    .in("lead_id", leadIds)
    .in("activity_type", ["sms_sent", "email_sent", "call"])
    .order("created_at", { ascending: false })

  // Build conversation previews for ALL leads
  const withHistory: ConversationPreview[] = []
  const withoutHistory: ConversationPreview[] = []

  for (const lead of leads) {
    const leadName =
      [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed"

    // Find most recent SMS for this lead
    const latestSms = smsLogs?.find((s) => s.lead_id === lead.id)

    // Find most recent communication activity for this lead
    const latestActivity = activities?.find((a) => a.lead_id === lead.id)

    // Pick the most recent between SMS and activity
    let lastMessage: string | null = null
    let lastMessageAt: string | null = null
    let lastMessageType: "sms" | "email" | "call" | null = null

    const smsTime = latestSms?.created_at ?? ""
    const actTime = latestActivity?.created_at ?? ""

    if (smsTime && (!actTime || smsTime > actTime)) {
      lastMessage = latestSms?.message ?? null
      lastMessageAt = smsTime
      lastMessageType = "sms"
    } else if (actTime) {
      lastMessage = latestActivity?.title ?? null
      lastMessageAt = actTime
      lastMessageType =
        latestActivity?.activity_type === "email_sent"
          ? "email"
          : latestActivity?.activity_type === "call"
            ? "call"
            : "sms"
    }

    const hasHistory = lastMessageAt !== null

    const preview: ConversationPreview = {
      leadId: lead.id,
      leadName,
      phone: lead.phone,
      email: lead.email,
      state: lead.state,
      status: (lead.status ?? "new") as LeadStatus,
      source: (lead.source ?? "manual") as LeadSource,
      lastMessage,
      lastMessageAt,
      lastMessageType,
      hasHistory,
      unreadCount: unreadCountMap[lead.id] ?? 0,
      createdAt: lead.created_at,
    }

    if (hasHistory) {
      withHistory.push(preview)
    } else {
      withoutHistory.push(preview)
    }
  }

  // Sort: leads with history by lastMessageAt DESC, then remaining by createdAt DESC
  withHistory.sort((a, b) =>
    (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
  )
  withoutHistory.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return [...withHistory, ...withoutHistory]
}
