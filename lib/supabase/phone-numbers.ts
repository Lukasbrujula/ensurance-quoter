/* ------------------------------------------------------------------ */
/*  Agent Phone Numbers — CRUD                                         */
/*  Auth client by default, optional service role for webhooks.        */
/* ------------------------------------------------------------------ */

import { createClerkSupabaseClient } from "./clerk-client"
import type { DbClient } from "./server"
import type { Tables } from "@/lib/types/database.generated"

type PhoneNumberRow = Tables<"agent_phone_numbers">

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export type NumberType = "local" | "toll_free"

export interface AgentPhoneNumber {
  id: string
  agentId: string
  phoneNumber: string
  telnyxPhoneNumberId: string | null
  aiAgentId: string | null
  assigneeAgentId: string | null
  isPrimary: boolean
  label: string | null
  numberType: NumberType
  smsEnabled: boolean
  voiceEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePhoneNumberInput {
  agentId: string
  phoneNumber: string
  telnyxPhoneNumberId?: string
  aiAgentId?: string
  isPrimary?: boolean
  label?: string
  numberType?: NumberType
}

export interface UpdatePhoneNumberInput {
  label?: string
  isPrimary?: boolean
  aiAgentId?: string | null
  smsEnabled?: boolean
  voiceEnabled?: boolean
}

/* ------------------------------------------------------------------ */
/*  Mapping                                                            */
/* ------------------------------------------------------------------ */

function rowToPhoneNumber(row: PhoneNumberRow): AgentPhoneNumber {
  return {
    id: row.id,
    agentId: row.agent_id,
    phoneNumber: row.phone_number,
    telnyxPhoneNumberId: row.telnyx_phone_number_id,
    aiAgentId: row.ai_agent_id,
    assigneeAgentId: row.assignee_agent_id,
    isPrimary: row.is_primary,
    label: row.label,
    numberType: (row.number_type === "toll_free" ? "toll_free" : "local") as NumberType,
    smsEnabled: row.sms_enabled,
    voiceEnabled: row.voice_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/* ------------------------------------------------------------------ */
/*  Data access                                                        */
/* ------------------------------------------------------------------ */

export async function listPhoneNumbers(
  agentId: string,
): Promise<AgentPhoneNumber[]> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to list phone numbers: ${error.message}`)
  return (data ?? []).map(rowToPhoneNumber)
}

export async function getPhoneNumberByNumber(
  phoneNumber: string,
  client?: DbClient,
): Promise<AgentPhoneNumber | null> {
  const supabase = client ?? (await createClerkSupabaseClient())
  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle()

  if (error) throw new Error(`Failed to look up phone number: ${error.message}`)
  return data ? rowToPhoneNumber(data) : null
}

export async function createPhoneNumber(
  input: CreatePhoneNumberInput,
): Promise<AgentPhoneNumber> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .insert({
      agent_id: input.agentId,
      phone_number: input.phoneNumber,
      telnyx_phone_number_id: input.telnyxPhoneNumberId ?? null,
      ai_agent_id: input.aiAgentId ?? null,
      is_primary: input.isPrimary ?? false,
      label: input.label ?? null,
      number_type: input.numberType ?? "local",
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create phone number: ${error.message}`)
  return rowToPhoneNumber(data)
}

export async function updatePhoneNumber(
  agentId: string,
  id: string,
  input: UpdatePhoneNumberInput,
): Promise<AgentPhoneNumber> {
  const supabase = await createClerkSupabaseClient()

  // If setting as primary, unset others first
  if (input.isPrimary) {
    await supabase
      .from("agent_phone_numbers")
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq("agent_id", agentId)
      .neq("id", id)
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.label !== undefined) update.label = input.label
  if (input.isPrimary !== undefined) update.is_primary = input.isPrimary
  if (input.aiAgentId !== undefined) update.ai_agent_id = input.aiAgentId
  if (input.smsEnabled !== undefined) update.sms_enabled = input.smsEnabled
  if (input.voiceEnabled !== undefined) update.voice_enabled = input.voiceEnabled

  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .update(update)
    .eq("id", id)
    .eq("agent_id", agentId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update phone number: ${error.message}`)
  return rowToPhoneNumber(data)
}

export async function deletePhoneNumber(
  agentId: string,
  id: string,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase
    .from("agent_phone_numbers")
    .delete()
    .eq("id", id)
    .eq("agent_id", agentId)

  if (error) throw new Error(`Failed to delete phone number: ${error.message}`)
}

export async function getTollFreePhoneNumber(
  agentId: string,
  client?: DbClient,
): Promise<AgentPhoneNumber | null> {
  const supabase = client ?? (await createClerkSupabaseClient())
  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .select("*")
    .eq("agent_id", agentId)
    .eq("number_type", "toll_free")
    .eq("sms_enabled", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data ? rowToPhoneNumber(data) : null
}

export async function getPrimaryPhoneNumber(
  agentId: string,
  client?: DbClient,
): Promise<AgentPhoneNumber | null> {
  const supabase = client ?? (await createClerkSupabaseClient())
  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .select("*")
    .eq("agent_id", agentId)
    .eq("is_primary", true)
    .maybeSingle()

  if (error) return null
  return data ? rowToPhoneNumber(data) : null
}

/**
 * List all phone numbers for an org (admin view).
 * Uses service role client to bypass RLS agent_id scoping.
 */
export async function listOrgPhoneNumbers(
  orgId: string,
  client: DbClient,
): Promise<AgentPhoneNumber[]> {
  const { data, error } = await client
    .from("agent_phone_numbers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to list org phone numbers: ${error.message}`)
  return (data ?? []).map(rowToPhoneNumber)
}

/**
 * List phone numbers assigned to a specific agent (not owned, but assigned).
 */
export async function listAssignedPhoneNumbers(
  agentId: string,
  client?: DbClient,
): Promise<AgentPhoneNumber[]> {
  const supabase = client ?? (await createClerkSupabaseClient())
  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .select("*")
    .eq("assignee_agent_id", agentId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to list assigned phone numbers: ${error.message}`)
  return (data ?? []).map(rowToPhoneNumber)
}

/**
 * Assign a phone number to a team agent. Requires service role client.
 * Pass null agentId to unassign.
 */
export async function assignPhoneNumber(
  phoneNumberId: string,
  assigneeAgentId: string | null,
  client: DbClient,
): Promise<AgentPhoneNumber> {
  const { data, error } = await client
    .from("agent_phone_numbers")
    .update({
      assignee_agent_id: assigneeAgentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", phoneNumberId)
    .select()
    .single()

  if (error) throw new Error(`Failed to assign phone number: ${error.message}`)
  return rowToPhoneNumber(data)
}
