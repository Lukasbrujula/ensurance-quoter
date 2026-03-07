/* ------------------------------------------------------------------ */
/*  Agent Licenses CRUD                                                */
/*  Uses Clerk-authenticated Supabase client (respects RLS).           */
/* ------------------------------------------------------------------ */

import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"

export interface AgentLicense {
  id: string
  agent_id: string
  state: string
  license_number: string
  license_type: string
  issue_date: string | null
  expiration_date: string | null
  status: string
  created_at: string | null
  updated_at: string | null
}

export type LicenseInsert = Pick<
  AgentLicense,
  "state" | "license_number" | "license_type" | "issue_date" | "expiration_date"
>

export type LicenseUpdate = Partial<LicenseInsert>

export async function getLicenses(agentId: string): Promise<AgentLicense[]> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_licenses")
    .select("*")
    .eq("agent_id", agentId)
    .order("state", { ascending: true })

  if (error) throw new Error(`Failed to fetch licenses: ${error.message}`)
  return (data ?? []) as AgentLicense[]
}

export async function addLicense(
  agentId: string,
  license: LicenseInsert,
): Promise<AgentLicense> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_licenses")
    .insert({
      agent_id: agentId,
      state: license.state,
      license_number: license.license_number,
      license_type: license.license_type,
      issue_date: license.issue_date ?? null,
      expiration_date: license.expiration_date ?? null,
      status: "active",
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add license: ${error.message}`)
  return data as AgentLicense
}

export async function updateLicense(
  agentId: string,
  id: string,
  updates: LicenseUpdate,
): Promise<AgentLicense> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_licenses")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("agent_id", agentId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update license: ${error.message}`)
  return data as AgentLicense
}

export async function deleteLicense(agentId: string, id: string): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase
    .from("agent_licenses")
    .delete()
    .eq("id", id)
    .eq("agent_id", agentId)

  if (error) throw new Error(`Failed to delete license: ${error.message}`)
}
