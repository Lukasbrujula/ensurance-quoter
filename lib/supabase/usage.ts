/* ------------------------------------------------------------------ */
/*  Usage Data Access                                                  */
/* ------------------------------------------------------------------ */

import { createAuthClient } from "./auth-server"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UsageStats {
  phoneNumbers: PhoneNumberInfo[]
  calling: {
    outboundMinutes: number
    inboundMinutes: number
    aiAgentMinutes: number
  }
  platform: {
    quotesGenerated: number
    enrichmentLookups: number
    leadsCreated: number
  }
  costs: CostLineItem[]
  totalCost: number
}

export interface PhoneNumberInfo {
  number: string
  label: string
  status: "active" | "inactive"
}

export interface CostLineItem {
  service: string
  usage: string
  rate: string
  cost: number
}

/* ------------------------------------------------------------------ */
/*  Cost rates (estimates)                                             */
/* ------------------------------------------------------------------ */

const COST_RATES = {
  outbound_per_min: 0.02,
  inbound_per_min: 0.02,
  ai_agent_per_min: 0.05,
  transcription_per_min: 0.008,
  enrichment_lookup: 0.10,
} as const

/* ------------------------------------------------------------------ */
/*  Main query                                                         */
/* ------------------------------------------------------------------ */

export async function getUsageStats(
  agentId: string,
  since: string,
  until: string,
): Promise<UsageStats> {
  const supabase = await createAuthClient()

  const [
    callLogsResult,
    aiAgentsResult,
    quotesResult,
    enrichmentsResult,
    leadsResult,
    agentSettingsResult,
  ] = await Promise.all([
    // Call logs for the period
    supabase
      .from("call_logs")
      .select("direction, duration_seconds, leads!inner(agent_id)")
      .eq("leads.agent_id", agentId)
      .gte("started_at", since)
      .lte("started_at", until),

    // AI agent stats
    supabase
      .from("ai_agents")
      .select("phone_number, total_calls, total_minutes, status")
      .eq("agent_id", agentId),

    // Quotes count
    supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("leads!inner.agent_id" as string, agentId)
      .gte("created_at", since)
      .lte("created_at", until),

    // Enrichments count
    supabase
      .from("enrichments")
      .select("id", { count: "exact", head: true })
      .eq("leads!inner.agent_id" as string, agentId)
      .gte("created_at", since)
      .lte("created_at", until),

    // Leads created count
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .gte("created_at", since)
      .lte("created_at", until),

    // Agent settings (for phone number)
    supabase
      .from("agent_settings")
      .select("*")
      .eq("agent_id", agentId)
      .maybeSingle(),
  ])

  // Calculate call minutes
  const callLogs = callLogsResult.data ?? []
  let outboundSeconds = 0
  let inboundSeconds = 0
  for (const log of callLogs) {
    const dur = (log.duration_seconds ?? 0) as number
    if (log.direction === "outbound") outboundSeconds += dur
    else inboundSeconds += dur
  }

  const outboundMinutes = Math.round(outboundSeconds / 60)
  const inboundMinutes = Math.round(inboundSeconds / 60)

  // AI agent minutes
  const aiAgents = aiAgentsResult.data ?? []
  const aiAgentMinutes = aiAgents.reduce(
    (sum, a) => sum + (a.total_minutes ?? 0),
    0,
  )

  // Phone numbers from agents + settings
  const phoneNumbers: PhoneNumberInfo[] = []
  const settings = agentSettingsResult.data
  if (settings) {
    const telnyxNumber = (settings as Record<string, unknown>).telnyx_caller_number as string | undefined
    if (telnyxNumber) {
      phoneNumbers.push({
        number: telnyxNumber,
        label: "Outbound calling",
        status: "active",
      })
    }
  }
  for (const agent of aiAgents) {
    if (agent.phone_number) {
      phoneNumbers.push({
        number: agent.phone_number,
        label: "AI Agent",
        status: agent.status === "active" ? "active" : "inactive",
      })
    }
  }

  // Platform stats
  const quotesGenerated = quotesResult.count ?? 0
  const enrichmentLookups = enrichmentsResult.count ?? 0
  const leadsCreated = leadsResult.count ?? 0

  // Cost calculation
  const totalTranscriptionMin = outboundMinutes + inboundMinutes
  const costs: CostLineItem[] = []

  if (outboundMinutes > 0) {
    costs.push({
      service: "Outbound calls",
      usage: `${outboundMinutes} min`,
      rate: `$${COST_RATES.outbound_per_min}/min`,
      cost: round2(outboundMinutes * COST_RATES.outbound_per_min),
    })
  }
  if (inboundMinutes > 0) {
    costs.push({
      service: "Inbound calls",
      usage: `${inboundMinutes} min`,
      rate: `$${COST_RATES.inbound_per_min}/min`,
      cost: round2(inboundMinutes * COST_RATES.inbound_per_min),
    })
  }
  if (aiAgentMinutes > 0) {
    costs.push({
      service: "AI Agent calls",
      usage: `${Math.round(aiAgentMinutes)} min`,
      rate: `$${COST_RATES.ai_agent_per_min}/min`,
      cost: round2(aiAgentMinutes * COST_RATES.ai_agent_per_min),
    })
  }
  if (totalTranscriptionMin > 0) {
    costs.push({
      service: "Transcription",
      usage: `${totalTranscriptionMin} min`,
      rate: `$${COST_RATES.transcription_per_min}/min`,
      cost: round2(totalTranscriptionMin * COST_RATES.transcription_per_min),
    })
  }
  if (enrichmentLookups > 0) {
    costs.push({
      service: "Enrichment lookups",
      usage: `${enrichmentLookups} lookups`,
      rate: `$${COST_RATES.enrichment_lookup}/lookup`,
      cost: round2(enrichmentLookups * COST_RATES.enrichment_lookup),
    })
  }

  const totalCost = round2(costs.reduce((sum, c) => sum + c.cost, 0))

  return {
    phoneNumbers,
    calling: { outboundMinutes, inboundMinutes, aiAgentMinutes: Math.round(aiAgentMinutes) },
    platform: { quotesGenerated, enrichmentLookups, leadsCreated },
    costs,
    totalCost,
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
