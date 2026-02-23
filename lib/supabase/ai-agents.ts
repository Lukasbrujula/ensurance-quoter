import { createServerClient } from "./server"
import type {
  AiAgentRow,
  AiAgentStatus,
  AiTranscriptRow,
  TranscriptRole,
} from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  AI Agent CRUD                                                      */
/* ------------------------------------------------------------------ */

export async function listAgents(agentId: string): Promise<AiAgentRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("listAgents error:", error)
    throw new Error("Failed to list AI agents")
  }

  return (data ?? []) as unknown as AiAgentRow[]
}

export async function getAgent(
  agentId: string,
  id: string,
): Promise<AiAgentRow | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("id", id)
    .eq("agent_id", agentId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // not found
    console.error("getAgent error:", error)
    throw new Error("Failed to get AI agent")
  }

  return data as unknown as AiAgentRow
}

export async function getAgentByTelnyxAssistantId(
  assistantId: string,
): Promise<AiAgentRow | null> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("telnyx_assistant_id", assistantId)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    console.error("getAgentByTelnyxAssistantId error:", error)
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
  voice?: string | null
  telnyxAssistantId?: string | null
  systemPrompt?: string | null
  status?: AiAgentStatus
}

export async function createAgent(input: CreateAgentInput): Promise<AiAgentRow> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .insert({
      agent_id: input.agentId,
      name: input.name,
      description: input.description ?? null,
      phone_number: input.phoneNumber ?? null,
      greeting: input.greeting ?? null,
      voice: input.voice ?? "Telnyx.NaturalHD.astra",
      model: "Qwen/Qwen3-235B-A22B",
      telnyx_assistant_id: input.telnyxAssistantId ?? null,
      system_prompt: input.systemPrompt ?? null,
      status: input.status ?? "inactive",
      total_calls: 0,
      total_minutes: 0,
    })
    .select("*")
    .single()

  if (error) {
    console.error("createAgent error:", error)
    throw new Error("Failed to create AI agent")
  }

  return data as unknown as AiAgentRow
}

interface UpdateAgentInput {
  name?: string
  description?: string | null
  phoneNumber?: string | null
  greeting?: string | null
  voice?: string | null
  status?: AiAgentStatus
  telnyxAssistantId?: string | null
  systemPrompt?: string | null
}

export async function updateAgent(
  agentId: string,
  id: string,
  input: UpdateAgentInput,
): Promise<AiAgentRow> {
  const supabase = createServerClient()

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.phoneNumber !== undefined) updates.phone_number = input.phoneNumber
  if (input.greeting !== undefined) updates.greeting = input.greeting
  if (input.voice !== undefined) updates.voice = input.voice
  if (input.status !== undefined) updates.status = input.status
  if (input.telnyxAssistantId !== undefined)
    updates.telnyx_assistant_id = input.telnyxAssistantId
  if (input.systemPrompt !== undefined) updates.system_prompt = input.systemPrompt

  const { data, error } = await supabase
    .from("ai_agents")
    .update(updates)
    .eq("id", id)
    .eq("agent_id", agentId)
    .select("*")
    .single()

  if (error) {
    console.error("updateAgent error:", error)
    throw new Error("Failed to update AI agent")
  }

  return data as unknown as AiAgentRow
}

export async function deleteAgent(
  agentId: string,
  id: string,
): Promise<void> {
  const supabase = createServerClient()
  const { error } = await supabase
    .from("ai_agents")
    .delete()
    .eq("id", id)
    .eq("agent_id", agentId)

  if (error) {
    console.error("deleteAgent error:", error)
    throw new Error("Failed to delete AI agent")
  }
}

/* ------------------------------------------------------------------ */
/*  Agent stats                                                        */
/* ------------------------------------------------------------------ */

export async function incrementAgentStats(
  aiAgentId: string,
  additionalMinutes: number,
): Promise<void> {
  const supabase = createServerClient()

  // Use RPC or manual increment — Supabase doesn't support atomic increment
  // So we read, then update
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("total_calls, total_minutes")
    .eq("id", aiAgentId)
    .single()

  if (!agent) return

  await supabase
    .from("ai_agents")
    .update({
      total_calls: (agent.total_calls ?? 0) + 1,
      total_minutes: Math.round(
        ((agent.total_minutes ?? 0) + additionalMinutes) * 100,
      ) / 100,
      last_call_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", aiAgentId)
}

/* ------------------------------------------------------------------ */
/*  Transcript storage + retrieval                                     */
/* ------------------------------------------------------------------ */

export async function getTranscriptMessages(
  agentId: string,
  callId: string,
): Promise<AiTranscriptRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_transcripts")
    .select("*")
    .eq("call_id", callId)
    .eq("agent_id", agentId)
    .order("message_index", { ascending: true })

  if (error) {
    console.error("getTranscriptMessages error:", error)
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
): Promise<void> {
  if (messages.length === 0) return

  const supabase = createServerClient()
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
    console.error("insertTranscriptMessages error:", error)
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
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_agent_calls")
    .select("*")
    .eq("agent_id", agentId)
    .eq("ai_agent_id", aiAgentId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("getAgentCalls error:", error)
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
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("ai_agents")
    .select("id, name, status, total_calls, total_minutes, last_call_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getAgentUsage error:", error)
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
