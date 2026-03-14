import { createClerkSupabaseClient } from "./clerk-client"
import { getUnreadCounts } from "./sms"
import { getEmailUnreadCounts, getLatestEmailPerLead } from "./email"
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
  starred: boolean
  urgent: boolean
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
    .select("id, first_name, last_name, phone, email, state, status, source, follow_up_date, created_at")
    .eq("agent_id", agentId)

  if (leadError || !leads || leads.length === 0) return []

  const leadIds = leads.map((l) => l.id)

  // Fetch unread counts per lead (SMS + email)
  const [unreadCountMap, emailUnreadMap] = await Promise.all([
    getUnreadCounts(agentId),
    getEmailUnreadCounts(agentId),
  ])

  // Merge unread counts
  const mergedUnread: Record<string, number> = { ...unreadCountMap }
  for (const [id, count] of Object.entries(emailUnreadMap)) {
    mergedUnread[id] = (mergedUnread[id] ?? 0) + count
  }

  // Fetch most recent SMS log per lead
  const { data: smsLogs } = await supabase
    .from("sms_logs")
    .select("lead_id, message, created_at, direction")
    .eq("agent_id", agentId)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false })

  // Fetch most recent email per lead
  const latestEmailMap = await getLatestEmailPerLead(agentId, leadIds)

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

    // Find most recent email for this lead
    const latestEmail = latestEmailMap.get(lead.id)

    // Find most recent communication activity for this lead
    const latestActivity = activities?.find((a) => a.lead_id === lead.id)

    // Pick the most recent between SMS, email, and activity
    let lastMessage: string | null = null
    let lastMessageAt: string | null = null
    let lastMessageType: "sms" | "email" | "call" | null = null

    const smsTime = latestSms?.created_at ?? ""
    const emailTime = latestEmail?.createdAt ?? ""
    const actTime = latestActivity?.created_at ?? ""

    // Compare all three timestamps to find the most recent
    const candidates = [
      { time: smsTime, type: "sms" as const, msg: latestSms?.message ?? null },
      { time: emailTime, type: "email" as const, msg: latestEmail?.subject ?? latestEmail?.bodySnippet ?? null },
      { time: actTime, type: "activity" as const, msg: latestActivity?.title ?? null },
    ].filter((c) => c.time)

    candidates.sort((a, b) => b.time.localeCompare(a.time))
    const winner = candidates[0]

    if (winner) {
      lastMessage = winner.msg
      lastMessageAt = winner.time
      if (winner.type === "activity") {
        lastMessageType =
          latestActivity?.activity_type === "email_sent"
            ? "email"
            : latestActivity?.activity_type === "call"
              ? "call"
              : "sms"
      } else {
        lastMessageType = winner.type
      }
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
      unreadCount: mergedUnread[lead.id] ?? 0,
      starred: (lead as Record<string, unknown>).starred as boolean ?? false,
      urgent: (lead as Record<string, unknown>).urgent as boolean ?? false,
      createdAt: lead.created_at,
    }

    if (hasHistory) {
      withHistory.push(preview)
    } else {
      withoutHistory.push(preview)
    }
  }

  // Sort: urgent first, then by lastMessageAt DESC, then remaining by createdAt DESC
  withHistory.sort((a, b) => {
    // Urgent conversations float to the top
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
    return (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "")
  })
  withoutHistory.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return [...withHistory, ...withoutHistory]
}

/**
 * Get conversation previews for all leads in an organization (team scope).
 * Same logic as getConversationPreviews but scoped by org_id on leads.
 */
export async function getConversationPreviewsByOrg(
  orgId: string,
): Promise<ConversationPreview[]> {
  const supabase = await createClerkSupabaseClient()

  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, email, state, status, source, follow_up_date, created_at, agent_id")
    .eq("org_id", orgId)

  if (leadError || !leads || leads.length === 0) return []

  const leadIds = leads.map((l) => l.id)
  // Collect unique agent_ids for SMS unread counts
  const agentIds = [...new Set(leads.map((l) => l.agent_id))]

  // Fetch unread counts across all agents in the org
  const unreadPromises = agentIds.map((aid) => getUnreadCounts(aid))
  const emailUnreadPromises = agentIds.map((aid) => getEmailUnreadCounts(aid))
  const [unreadResults, emailUnreadResults] = await Promise.all([
    Promise.all(unreadPromises),
    Promise.all(emailUnreadPromises),
  ])

  const mergedUnread: Record<string, number> = {}
  for (const countMap of unreadResults) {
    for (const [id, count] of Object.entries(countMap)) {
      mergedUnread[id] = (mergedUnread[id] ?? 0) + count
    }
  }
  for (const countMap of emailUnreadResults) {
    for (const [id, count] of Object.entries(countMap)) {
      mergedUnread[id] = (mergedUnread[id] ?? 0) + count
    }
  }

  // Fetch most recent SMS log per lead (across all agents in org)
  const { data: smsLogs } = await supabase
    .from("sms_logs")
    .select("lead_id, message, created_at, direction")
    .in("agent_id", agentIds)
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false })

  // Fetch most recent emails per lead
  const emailPromises = agentIds.map((aid) => getLatestEmailPerLead(aid, leadIds))
  const emailMaps = await Promise.all(emailPromises)
  const latestEmailMap = new Map<string, { subject?: string | null; bodySnippet?: string | null; createdAt: string }>()
  for (const emap of emailMaps) {
    for (const [id, entry] of emap) {
      const existing = latestEmailMap.get(id)
      if (!existing || entry.createdAt > existing.createdAt) {
        latestEmailMap.set(id, entry)
      }
    }
  }

  // Fetch most recent communication-type activities per lead
  const { data: activities } = await supabase
    .from("activity_logs")
    .select("lead_id, title, created_at, activity_type")
    .in("agent_id", agentIds)
    .in("lead_id", leadIds)
    .in("activity_type", ["sms_sent", "email_sent", "call"])
    .order("created_at", { ascending: false })

  const withHistory: ConversationPreview[] = []
  const withoutHistory: ConversationPreview[] = []

  for (const lead of leads) {
    const leadName =
      [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed"

    const latestSms = smsLogs?.find((s) => s.lead_id === lead.id)
    const latestEmail = latestEmailMap.get(lead.id)
    const latestActivity = activities?.find((a) => a.lead_id === lead.id)

    let lastMessage: string | null = null
    let lastMessageAt: string | null = null
    let lastMessageType: "sms" | "email" | "call" | null = null

    const smsTime = latestSms?.created_at ?? ""
    const emailTime = latestEmail?.createdAt ?? ""
    const actTime = latestActivity?.created_at ?? ""

    const candidates = [
      { time: smsTime, type: "sms" as const, msg: latestSms?.message ?? null },
      { time: emailTime, type: "email" as const, msg: latestEmail?.subject ?? latestEmail?.bodySnippet ?? null },
      { time: actTime, type: "activity" as const, msg: latestActivity?.title ?? null },
    ].filter((c) => c.time)

    candidates.sort((a, b) => b.time.localeCompare(a.time))
    const winner = candidates[0]

    if (winner) {
      lastMessage = winner.msg
      lastMessageAt = winner.time
      if (winner.type === "activity") {
        lastMessageType =
          latestActivity?.activity_type === "email_sent"
            ? "email"
            : latestActivity?.activity_type === "call"
              ? "call"
              : "sms"
      } else {
        lastMessageType = winner.type
      }
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
      unreadCount: mergedUnread[lead.id] ?? 0,
      starred: (lead as Record<string, unknown>).starred as boolean ?? false,
      urgent: (lead as Record<string, unknown>).urgent as boolean ?? false,
      createdAt: lead.created_at,
    }

    if (hasHistory) {
      withHistory.push(preview)
    } else {
      withoutHistory.push(preview)
    }
  }

  withHistory.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
    return (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "")
  })
  withoutHistory.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return [...withHistory, ...withoutHistory]
}
