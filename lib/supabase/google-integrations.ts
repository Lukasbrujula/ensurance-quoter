/* ------------------------------------------------------------------ */
/*  Google Calendar Integration — Data Layer                           */
/*  Token storage and retrieval with RLS (auth client by default).     */
/* ------------------------------------------------------------------ */

import { createAuthClient } from "./auth-server"
import type { DbClient } from "./server"

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiryDate: number
  email: string | null
  calendarId: string
}

/**
 * Get stored Google tokens for an agent.
 * Returns null if not connected.
 */
export async function getGoogleTokens(
  agentId: string,
  client?: DbClient,
): Promise<GoogleTokens | null> {
  const supabase = client ?? (await createAuthClient())

  const { data, error } = await supabase
    .from("google_integrations")
    .select("*")
    .eq("agent_id", agentId)
    .single()

  if (error || !data) return null

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiryDate: new Date(data.token_expiry).getTime(),
    email: data.email,
    calendarId: data.calendar_id ?? "primary",
  }
}

/** Store Google tokens after initial OAuth. */
export async function storeGoogleTokens(
  agentId: string,
  tokens: {
    access_token: string
    refresh_token: string
    expiry_date: number
    email?: string | null
  },
): Promise<void> {
  const supabase = await createAuthClient()

  const { error } = await supabase.from("google_integrations").upsert(
    {
      agent_id: agentId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(tokens.expiry_date).toISOString(),
      email: tokens.email ?? null,
      calendar_id: "primary",
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "agent_id" },
  )

  if (error) throw new Error("Failed to store Google tokens")
}

/** Update tokens after a refresh. */
export async function updateGoogleTokens(
  agentId: string,
  newTokens: {
    access_token?: string
    refresh_token?: string
    expiry_date?: number
  },
  client?: DbClient,
): Promise<void> {
  const supabase = client ?? (await createAuthClient())

  const update: Record<string, string> = {
    updated_at: new Date().toISOString(),
  }
  if (newTokens.access_token) update.access_token = newTokens.access_token
  if (newTokens.refresh_token) update.refresh_token = newTokens.refresh_token
  if (newTokens.expiry_date) {
    update.token_expiry = new Date(newTokens.expiry_date).toISOString()
  }

  await supabase
    .from("google_integrations")
    .update(update)
    .eq("agent_id", agentId)
}

/** Delete Google tokens (disconnect). */
export async function deleteGoogleTokens(agentId: string): Promise<void> {
  const supabase = await createAuthClient()

  const { error } = await supabase
    .from("google_integrations")
    .delete()
    .eq("agent_id", agentId)

  if (error) throw new Error("Failed to delete Google tokens")
}

/** Check if an agent has Google Calendar connected. */
export async function isGoogleConnected(
  agentId: string,
  client?: DbClient,
): Promise<boolean> {
  const supabase = client ?? (await createAuthClient())

  const { data } = await supabase
    .from("google_integrations")
    .select("id")
    .eq("agent_id", agentId)
    .single()

  return !!data
}
