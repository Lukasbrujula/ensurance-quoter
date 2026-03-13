/* ------------------------------------------------------------------ */
/*  Telnyx Messaging Profiles API                                      */
/*  Create/read/update messaging profiles for SMS webhook routing.     */
/* ------------------------------------------------------------------ */

const TELNYX_BASE = "https://api.telnyx.com/v2"

function getApiKey(): string {
  const key = process.env.TELNYX_API_KEY
  if (!key) throw new Error("TELNYX_API_KEY is not configured")
  return key
}

async function request<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${TELNYX_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Telnyx API error (${response.status}): ${text}`)
  }

  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MessagingProfile {
  id: string
  name: string
  enabled: boolean
  webhook_url: string | null
  webhook_api_version: string
}

interface MessagingProfileResponse {
  data: MessagingProfile
}

/* ------------------------------------------------------------------ */
/*  CRUD                                                               */
/* ------------------------------------------------------------------ */

export async function createMessagingProfile(
  name: string,
  webhookUrl: string,
): Promise<MessagingProfile> {
  const result = await request<MessagingProfileResponse>(
    "POST",
    "/messaging_profiles",
    {
      name,
      webhook_url: webhookUrl,
      webhook_api_version: "2",
      enabled: true,
      whitelisted_destinations: ["US"],
    },
  )
  return result.data
}

export async function getMessagingProfile(
  id: string,
): Promise<MessagingProfile> {
  const result = await request<MessagingProfileResponse>(
    "GET",
    `/messaging_profiles/${id}`,
  )
  return result.data
}

export async function updateMessagingProfile(
  id: string,
  updates: { name?: string; webhookUrl?: string; enabled?: boolean },
): Promise<MessagingProfile> {
  const body: Record<string, unknown> = {}
  if (updates.name !== undefined) body.name = updates.name
  if (updates.webhookUrl !== undefined) body.webhook_url = updates.webhookUrl
  if (updates.enabled !== undefined) body.enabled = updates.enabled

  const result = await request<MessagingProfileResponse>(
    "PATCH",
    `/messaging_profiles/${id}`,
    body,
  )
  return result.data
}
