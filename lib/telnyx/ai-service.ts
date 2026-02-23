/* ------------------------------------------------------------------ */
/*  Telnyx AI Assistants API Service                                   */
/*  Stateless module — no caching, no module-level state.              */
/*  All functions validate TELNYX_API_KEY at call time (serverless).    */
/*  Adapted from: growthlywhatsapp/src/voice/services/telnyx.service.ts */
/* ------------------------------------------------------------------ */

import type {
  TelnyxAssistant,
  TelnyxAssistantCreateDto,
  TelnyxAssistantUpdateDto,
  TelnyxConversation,
  TelnyxConversationsResponse,
  TelnyxTranscriptMessage,
  TelnyxTranscriptResponse,
} from "./ai-types"

const TELNYX_AI_BASE = "https://api.telnyx.com/v2/ai"
const MAX_RETRIES = 3

/* ------------------------------------------------------------------ */
/*  Core request helper with retry + rate limiting                     */
/* ------------------------------------------------------------------ */

async function telnyxAIRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  retryCount = 0,
): Promise<T> {
  const apiKey = process.env.TELNYX_API_KEY
  if (!apiKey) {
    throw new Error("TELNYX_API_KEY environment variable is not configured")
  }

  const url = path.startsWith("http") ? path : `${TELNYX_AI_BASE}${path}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Rate limit handling with exponential backoff
    if (response.status === 429 && retryCount < MAX_RETRIES) {
      const backoffMs = Math.pow(2, retryCount) * 1000
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
      return telnyxAIRequest<T>(method, path, body, retryCount + 1)
    }

    if (!response.ok) {
      const errorBody = await response.text()

      // Parse 422 validation errors for better messages
      if (response.status === 422) {
        try {
          const errorJson = JSON.parse(errorBody)
          const errors = errorJson.errors || errorJson.error || errorBody
          throw new Error(`Telnyx validation error (422): ${JSON.stringify(errors)}`)
        } catch (parseError) {
          if (parseError instanceof Error && parseError.message.includes("422")) {
            throw parseError
          }
        }
      }

      throw new Error(
        `Telnyx API error: ${response.status} ${response.statusText}: ${errorBody}`,
      )
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text()
    if (!text) return {} as T
    return JSON.parse(text)
  } catch (error: unknown) {
    // Retry on network errors
    const isNetworkError =
      error instanceof Error &&
      (error.message?.includes("fetch failed") ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("ETIMEDOUT"))

    if (retryCount < MAX_RETRIES && isNetworkError) {
      const backoffMs = Math.pow(2, retryCount) * 1000
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
      return telnyxAIRequest<T>(method, path, body, retryCount + 1)
    }
    throw error
  }
}

/* ------------------------------------------------------------------ */
/*  Assistant CRUD                                                     */
/* ------------------------------------------------------------------ */

export async function createAssistant(
  dto: TelnyxAssistantCreateDto,
): Promise<TelnyxAssistant> {
  return telnyxAIRequest<TelnyxAssistant>("POST", "/assistants", dto)
}

/**
 * Update an assistant using POST (NOT PATCH — Telnyx uses POST for updates).
 * PATCH returns 404. Always includes promote_to_main: true.
 * WARNING: tools array is full overwrite — send ALL tools or they get removed.
 */
export async function updateAssistant(
  id: string,
  dto: TelnyxAssistantUpdateDto,
): Promise<TelnyxAssistant> {
  const payload = {
    ...dto,
    promote_to_main: true,
  }
  return telnyxAIRequest<TelnyxAssistant>("POST", `/assistants/${id}`, payload)
}

export async function getAssistant(id: string): Promise<TelnyxAssistant> {
  return telnyxAIRequest<TelnyxAssistant>("GET", `/assistants/${id}`)
}

export async function deleteAssistant(id: string): Promise<void> {
  await telnyxAIRequest<void>("DELETE", `/assistants/${id}`)
}

/* ------------------------------------------------------------------ */
/*  Conversations (AI call results)                                    */
/* ------------------------------------------------------------------ */

export async function getConversations(
  assistantId: string,
  params?: { page_size?: number },
): Promise<TelnyxConversation[]> {
  const pageSize = params?.page_size ?? 20
  const response = await telnyxAIRequest<TelnyxConversationsResponse>(
    "GET",
    `/assistants/${assistantId}/conversations?page[size]=${pageSize}`,
  )
  return response.data ?? []
}

export async function getTranscript(
  conversationId: string,
): Promise<TelnyxTranscriptMessage[]> {
  const response = await telnyxAIRequest<TelnyxTranscriptResponse>(
    "GET",
    `/conversations/${conversationId}/transcript`,
  )
  return response.data ?? []
}
