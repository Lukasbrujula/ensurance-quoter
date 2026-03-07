import { createClerkSupabaseClient } from "./clerk-client"
import type { DbClient } from "./server"
import type {
  AiAgentRow,
  AiAgentStatus,
  AiTranscriptRow,
  TranscriptRole,
  FAQEntry,
  BusinessHours,
  CollectFieldId,
  PostCallActionId,
} from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  AI Agent CRUD                                                      */
/* ------------------------------------------------------------------ */

export async function listAgents(agentId: string): Promise<AiAgentRow[]> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listAgents error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to list AI agents")
  }

  return (data ?? []) as unknown as AiAgentRow[]
}

export async function getAgent(
  agentId: string,
  id: string,
  client?: DbClient,
): Promise<AiAgentRow | null> {
  const supabase = client ?? await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", id)
    .eq("agent_id", agentId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // not found
    console.error("getAgent error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to get AI agent")
  }

  return data as unknown as AiAgentRow
}

export async function getAgentByTelnyxAssistantId(
  assistantId: string,
  client?: DbClient,
): Promise<AiAgentRow | null> {
  const supabase = client ?? await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("telnyx_assistant_id", assistantId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    console.error("getAgentByTelnyxAssistantId error:", error instanceof Error ? error.message : String(error))
    return null
  }

  return data as unknown as AiAgentRow
}

interface CreateAgentInput {
  agentId: string
  name: string
  description?: string | null
  phoneNumber?: string | null
  greeting?: string | null
  personality?: string | null
  voice?: string | null
  telnyxAssistantId?: string | null
  systemPrompt?: string | null
  status?: AiAgentStatus
  collectFields?: CollectFieldId[]
  postCallActions?: PostCallActionId[]
}

export async function createAgent(input: CreateAgentInput): Promise<AiAgentRow> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .insert({
      agent_id: input.agentId,
      name: input.name,
      description: input.description ?? null,
      phone_number: input.phoneNumber ?? null,
      greeting: input.greeting ?? null,
      personality: input.personality ?? null,
      voice: input.voice ?? "Telnyx.NaturalHD.astra",
      model: "Qwen/Qwen3-235B-A22B",
      telnyx_assistant_id: input.telnyxAssistantId ?? null,
      system_prompt: input.systemPrompt ?? null,
      status: input.status ?? "inactive",
      total_calls: 0,
      total_minutes: 0,
      collect_fields: input.collectFields ?? ["name", "phone", "reason", "callback_time"],
      post_call_actions: input.postCallActions ?? ["save_lead", "book_calendar", "send_notification"],
    })
    .select("*")
    .single()

  if (error) {
    console.error("createAgent error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to create AI agent")
  }

  return data as unknown as AiAgentRow
}

interface UpdateAgentInput {
  name?: string
  description?: string | null
  phoneNumber?: string | null
  greeting?: string | null
  personality?: string | null
  voice?: string | null
  status?: AiAgentStatus
  telnyxAssistantId?: string | null
  spanishAgentAssistantId?: string | null
  systemPrompt?: string | null
  faqEntries?: FAQEntry[]
  knowledgeBase?: string | null
  businessHours?: BusinessHours | null
  afterHoursGreeting?: string | null
  collectFields?: CollectFieldId[]
  postCallActions?: PostCallActionId[]
  callForwardNumber?: string | null
  tonePreset?: string | null
  customCollectFields?: Array<{ name: string; description: string; required?: boolean }>
  spanishEnabled?: boolean
}

export async function updateAgent(
  agentId: string,
  id: string,
  input: UpdateAgentInput,
): Promise<AiAgentRow> {
  const supabase = await createClerkSupabaseClient()

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.phoneNumber !== undefined) updates.phone_number = input.phoneNumber
  if (input.greeting !== undefined) updates.greeting = input.greeting
  if (input.personality !== undefined) updates.personality = input.personality
  if (input.voice !== undefined) updates.voice = input.voice
  if (input.status !== undefined) updates.status = input.status
  if (input.telnyxAssistantId !== undefined)
    updates.telnyx_assistant_id = input.telnyxAssistantId
  if (input.spanishAgentAssistantId !== undefined)
    updates.spanish_agent_assistant_id = input.spanishAgentAssistantId
  if (input.systemPrompt !== undefined) updates.system_prompt = input.systemPrompt
  if (input.faqEntries !== undefined) updates.faq_entries = input.faqEntries
  if (input.knowledgeBase !== undefined) updates.knowledge_base = input.knowledgeBase
  if (input.businessHours !== undefined) updates.business_hours = input.businessHours
  if (input.afterHoursGreeting !== undefined) updates.after_hours_greeting = input.afterHoursGreeting
  if (input.collectFields !== undefined) updates.collect_fields = input.collectFields
  if (input.postCallActions !== undefined) updates.post_call_actions = input.postCallActions
  if (input.callForwardNumber !== undefined) updates.call_forward_number = input.callForwardNumber
  if (input.tonePreset !== undefined) updates.tone_preset = input.tonePreset
  if (input.customCollectFields !== undefined) updates.custom_collect_fields = input.customCollectFields
  if (input.spanishEnabled !== undefined) updates.spanish_enabled = input.spanishEnabled

  const { data, error } = await supabase
    .from("ai_agents")
    .update(updates)
    .eq("id", id)
    .eq("agent_id", agentId)
    .select("*")
    .single()

  if (error) {
    console.error("updateAgent error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to update AI agent")
  }

  return data as unknown as AiAgentRow
}

export async function deleteAgent(
  agentId: string,
  id: string,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase
    .from("ai_agents")
    .delete()
    .eq("id", id)
    .eq("agent_id", agentId)

  if (error) {
    console.error("deleteAgent error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to delete AI agent")
  }
}

/* ------------------------------------------------------------------ */
/*  Agent stats                                                        */
/* ------------------------------------------------------------------ */

export async function incrementAgentStats(
  aiAgentId: string,
  additionalMinutes: number,
  client?: DbClient,
): Promise<void> {
  const supabase = client ?? await createClerkSupabaseClient()

  // Atomic increment via PostgreSQL RPC — prevents race conditions
  // when concurrent webhook calls arrive for the same agent
  const { error } = await supabase.rpc("increment_agent_stats", {
    p_agent_id: aiAgentId,
    p_additional_minutes: additionalMinutes,
  })

  if (error) {
    console.error("incrementAgentStats RPC error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to increment agent stats")
  }
}

/* ------------------------------------------------------------------ */
/*  Transcript storage + retrieval                                     */
/* ------------------------------------------------------------------ */

export async function getTranscriptMessages(
  agentId: string,
  callId: string,
): Promise<AiTranscriptRow[]> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("ai_transcripts")
    .select("*")
    .eq("call_id", callId)
    .eq("agent_id", agentId)
    .order("message_index", { ascending: true })

  if (error) {
    console.error("getTranscriptMessages error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to get transcript messages")
  }

  return (data ?? []) as unknown as AiTranscriptRow[]
}

interface TranscriptMessageInput {
  role: TranscriptRole
  content: string
  timestamp?: string | null
}

export async function insertTranscriptMessages(
  callId: string,
  aiAgentId: string,
  agentId: string,
  messages: TranscriptMessageInput[],
  client?: DbClient,
): Promise<void> {
  if (messages.length === 0) return

  const supabase = client ?? await createClerkSupabaseClient()
  const rows = messages.map((msg, index) => ({
    call_id: callId,
    ai_agent_id: aiAgentId,
    agent_id: agentId,
    role: msg.role,
    content: msg.content,
    message_index: index,
    timestamp: msg.timestamp ?? null,
  }))

  const { error } = await supabase.from("ai_transcripts").insert(rows)

  if (error) {
    console.error("insertTranscriptMessages error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to store transcript messages")
  }
}

/* ------------------------------------------------------------------ */
/*  Recent calls for an agent                                          */
/* ------------------------------------------------------------------ */

export async function getAgentCalls(
  agentId: string,
  aiAgentId: string,
  limit = 10,
): Promise<Record<string, unknown>[]> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("ai_agent_calls")
    .select("*")
    .eq("agent_id", agentId)
    .eq("ai_agent_id", aiAgentId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("getAgentCalls error:", error instanceof Error ? error.message : String(error))
    return []
  }

  return data ?? []
}

/* ------------------------------------------------------------------ */
/*  Usage stats                                                        */
/* ------------------------------------------------------------------ */

interface AgentUsageStats {
  id: string
  name: string
  status: AiAgentStatus
  total_calls: number
  total_minutes: number
  last_call_at: string | null
}

interface UsageResponse {
  agents: AgentUsageStats[]
  totals: {
    total_calls: number
    total_minutes: number
  }
}

export async function getAgentUsage(agentId: string): Promise<UsageResponse> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("id, name, status, total_calls, total_minutes, last_call_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getAgentUsage error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to get agent usage")
  }

  const agents: AgentUsageStats[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status as AiAgentStatus,
    total_calls: row.total_calls ?? 0,
    total_minutes: row.total_minutes ?? 0,
    last_call_at: row.last_call_at,
  }))

  const totals = agents.reduce(
    (acc, agent) => ({
      total_calls: acc.total_calls + agent.total_calls,
      total_minutes:
        Math.round((acc.total_minutes + agent.total_minutes) * 100) / 100,
    }),
    { total_calls: 0, total_minutes: 0 },
  )

  return { agents, totals }
}
