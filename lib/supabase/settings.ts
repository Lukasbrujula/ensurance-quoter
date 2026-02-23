import { createServerClient } from "./server"
import type { CommissionSettings, CarrierCommission } from "@/lib/types/commission"
import type { Json } from "@/lib/types/database.generated"

export async function getAgentSettings(
  userId: string
): Promise<CommissionSettings | null> {
  const supabase = createServerClient()
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
  const supabase = createServerClient()
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
    throw new Error(`Failed to save settings: ${error.message}`)
  }
}
