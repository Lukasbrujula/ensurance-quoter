import { createClerkSupabaseClient } from "./clerk-client"
import type { DbClient } from "./server"
import type { CommissionSettings, CarrierCommission } from "@/lib/types/commission"
import type { Json, TablesInsert } from "@/lib/types/database.generated"

/* ------------------------------------------------------------------ */
/*  Business Info                                                       */
/* ------------------------------------------------------------------ */

export interface BusinessInfo {
  companyName: string
  address: string
  city: string
  state: string
  zipCode: string
  businessType: string
  ein: string
  eoInsurance: string
  eoExpiry: string
}

const EMPTY_BUSINESS_INFO: BusinessInfo = {
  companyName: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  businessType: "",
  ein: "",
  eoInsurance: "",
  eoExpiry: "",
}

export async function getBusinessInfo(
  userId: string,
): Promise<BusinessInfo> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_settings")
    .select("business_info")
    .eq("user_id", userId)
    .single()

  if (error || !data?.business_info) return { ...EMPTY_BUSINESS_INFO }

  const raw = data.business_info as Record<string, unknown>
  return {
    companyName: (raw.companyName as string) ?? "",
    address: (raw.address as string) ?? "",
    city: (raw.city as string) ?? "",
    state: (raw.state as string) ?? "",
    zipCode: (raw.zipCode as string) ?? "",
    businessType: (raw.businessType as string) ?? "",
    ein: (raw.ein as string) ?? "",
    eoInsurance: (raw.eoInsurance as string) ?? "",
    eoExpiry: (raw.eoExpiry as string) ?? "",
  }
}

export async function upsertBusinessInfo(
  userId: string,
  info: BusinessInfo,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase.from("agent_settings").upsert(
    {
      user_id: userId,
      business_info: info as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) {
    throw new Error("Failed to save business information")
  }
}

/* ------------------------------------------------------------------ */
/*  AI Agent settings                                                   */
/* ------------------------------------------------------------------ */

export interface AIAgentSettings {
  assistantId: string | null
  enabled: boolean
}

export async function getAIAgentSettings(
  userId: string,
  client?: DbClient,
): Promise<AIAgentSettings> {
  const supabase = client ?? await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_settings")
    .select("telnyx_ai_assistant_id, telnyx_ai_enabled")
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    return { assistantId: null, enabled: false }
  }

  return {
    assistantId: data.telnyx_ai_assistant_id ?? null,
    enabled: data.telnyx_ai_enabled ?? false,
  }
}

export async function updateAIAgentSettings(
  userId: string,
  updates: Partial<{ assistantId: string | null; enabled: boolean }>,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  const upsertData: TablesInsert<"agent_settings"> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  if (updates.assistantId !== undefined) {
    upsertData.telnyx_ai_assistant_id = updates.assistantId
  }
  if (updates.enabled !== undefined) {
    upsertData.telnyx_ai_enabled = updates.enabled
  }

  const { error } = await supabase
    .from("agent_settings")
    .upsert(upsertData, { onConflict: "user_id" })

  if (error) {
    console.error("updateAIAgentSettings error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to save AI agent settings")
  }
}

/* ------------------------------------------------------------------ */
/*  Messaging profile                                                    */
/* ------------------------------------------------------------------ */

export async function getMessagingProfileId(
  userId: string,
): Promise<string | null> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_settings")
    .select("telnyx_messaging_profile_id")
    .eq("user_id", userId)
    .single()

  if (error || !data) return null
  return data.telnyx_messaging_profile_id ?? null
}

export async function setMessagingProfileId(
  userId: string,
  profileId: string,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase.from("agent_settings").upsert(
    {
      user_id: userId,
      telnyx_messaging_profile_id: profileId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) {
    throw new Error("Failed to save messaging profile ID")
  }
}

/* ------------------------------------------------------------------ */
/*  Billing group                                                       */
/* ------------------------------------------------------------------ */

export async function getBillingGroupId(
  userId: string,
): Promise<string | null> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_settings")
    .select("telnyx_billing_group_id")
    .eq("user_id", userId)
    .single()

  if (error || !data) return null
  return data.telnyx_billing_group_id ?? null
}

export async function setBillingGroupId(
  userId: string,
  billingGroupId: string,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase.from("agent_settings").upsert(
    {
      user_id: userId,
      telnyx_billing_group_id: billingGroupId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) {
    throw new Error("Failed to save billing group ID")
  }
}

/* ------------------------------------------------------------------ */
/*  Commission settings                                                 */
/* ------------------------------------------------------------------ */

export async function getAgentSettings(
  userId: string
): Promise<CommissionSettings | null> {
  const supabase = await createClerkSupabaseClient()
  const { data, error } = await supabase
    .from("agent_settings")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error || !data) return null

  return {
    defaultFirstYearPercent: Number(data.default_first_year_percent),
    defaultRenewalPercent: Number(data.default_renewal_percent),
    commissions: (data.carrier_commissions as unknown as CarrierCommission[]) ?? [],
  }
}

export async function upsertAgentSettings(
  userId: string,
  settings: CommissionSettings
): Promise<void> {
  const supabase = await createClerkSupabaseClient()
  const { error } = await supabase.from("agent_settings").upsert(
    {
      user_id: userId,
      default_first_year_percent: settings.defaultFirstYearPercent,
      default_renewal_percent: settings.defaultRenewalPercent,
      carrier_commissions: settings.commissions as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (error) {
    console.error("upsertAgentSettings error:", error instanceof Error ? error.message : String(error))
    throw new Error("Failed to save settings")
  }
}
