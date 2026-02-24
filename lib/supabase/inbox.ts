import { createAuthClient } from "./auth-server"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ConversationPreview {
  leadId: string
  leadName: string
  phone: string | null
  email: string | null
  state: string | null
  lastMessage: string
  lastMessageAt: string
  lastMessageType: "sms" | "email" | "call"
}

/* ------------------------------------------------------------------ */
/*  Data access                                                        */
/* ------------------------------------------------------------------ */

export async function getConversationPreviews(
  agentId: string,
): Promise<ConversationPreview[]> {
  const supabase = await createAuthClient()

  // Fetch leads with phone/email that belong to agent
  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, email, state")
    .eq("agent_id", agentId)

  if (leadError || !leads || leads.length === 0) return []

  // Fetch most recent SMS log per lead
  const leadIds = leads.map((l) => l.id)

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

  // Build a map: leadId → most recent communication
  const conversationMap = new Map<string, ConversationPreview>()

  for (const lead of leads) {
    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed"

    // Find most recent SMS for this lead
    const latestSms = smsLogs?.find((s) => s.lead_id === lead.id)

    // Find most recent communication activity for this lead
    const latestActivity = activities?.find((a) => a.lead_id === lead.id)

    // Pick the most recent between SMS and activity
    let lastMessage = ""
    let lastMessageAt = ""
    let lastMessageType: "sms" | "email" | "call" = "sms"

    const smsTime = latestSms?.created_at ?? ""
    const actTime = latestActivity?.created_at ?? ""

    if (smsTime && (!actTime || smsTime > actTime)) {
      lastMessage = latestSms?.message ?? ""
      lastMessageAt = smsTime
      lastMessageType = "sms"
    } else if (actTime) {
      lastMessage = latestActivity?.title ?? ""
      lastMessageAt = actTime
      lastMessageType =
        latestActivity?.activity_type === "email_sent"
          ? "email"
          : latestActivity?.activity_type === "call"
            ? "call"
            : "sms"
    }

    // Only include leads with communication history
    if (!lastMessageAt) continue

    conversationMap.set(lead.id, {
      leadId: lead.id,
      leadName,
      phone: lead.phone,
      email: lead.email,
      state: lead.state,
      lastMessage,
      lastMessageAt,
      lastMessageType,
    })
  }

  // Sort by most recent first
  return [...conversationMap.values()].sort(
    (a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt),
  )
}
