/* ------------------------------------------------------------------ */
/*  Telnyx AI Assistant Configuration Builder                           */
/*  Builds the full TelnyxAssistantCreateDto for the insurance agent.   */
/*  Follows TELNYX_WORKING_CONFIG.md exactly — minimal payload.         */
/* ------------------------------------------------------------------ */

import type { TelnyxAssistantCreateDto } from "./ai-types"
import { buildInboundAgentPrompt } from "@/lib/agents/prompt-builder"

/**
 * Build the full assistant creation payload.
 *
 * CRITICAL RULES (from TELNYX_WORKING_CONFIG.md):
 * - Model MUST be Qwen/Qwen3-235B-A22B (Llama outputs JSON as speech)
 * - Hangup tool requires deepgram/flux (nova-2 breaks WebRTC with hangup)
 * - Do NOT override Telnyx defaults (voice_speed, noise_suppression, time_limit_secs)
 * - enabled_features: ['telephony'] is REQUIRED for phone/WebRTC
 * - telephony_settings.supports_unauthenticated_web_calls: true for browser test calls
 */
export function buildInsuranceAssistantConfig(
  agentName: string,
  agencyName?: string,
  webhookUrl?: string,
  spanishAgentAssistantId?: string,
  opts?: {
    callForwardNumber?: string | null
    phoneNumber?: string | null
  },
): TelnyxAssistantCreateDto {
  const config: TelnyxAssistantCreateDto = {
    name: `Ensurance AI - ${agentName}`,
    model: "Qwen/Qwen3-235B-A22B",
    instructions: buildInboundAgentPrompt({ agentName, businessName: agencyName }),
    greeting: `Hi, you've reached ${agentName}'s office. They're not available right now, but I can take some information so they can call you back. How can I help?`,
    transcription: {
      model: "deepgram/flux",
      language: "en",
    },
    voice_settings: {
      voice: "Telnyx.NaturalHD.astra",
    },
    telephony_settings: {
      supports_unauthenticated_web_calls: true,
    },
    widget_settings: {
      theme: "light",
    },
    enabled_features: ["telephony"],
  }

  // Build tools array — hangup and handoff are mutually exclusive (untested together)
  const tools: TelnyxAssistantCreateDto["tools"] = []

  if (spanishAgentAssistantId) {
    tools.push({
      type: "handoff" as const,
      handoff: {
        description:
          "Transfer the caller to a Spanish-speaking specialist when they prefer Spanish",
        ai_assistants: [
          {
            name: "Spanish Agent",
            id: spanishAgentAssistantId,
          },
        ],
      },
    })
  } else {
    tools.push({
      type: "hangup" as const,
      hangup: {
        description:
          "Use this to end the call when the user says goodbye or wants to end the conversation",
      },
    })
  }

  // Add transfer tool if a call forward number is configured
  if (opts?.callForwardNumber) {
    tools.push({
      type: "transfer" as const,
      name: "transfer_to_agent",
      description:
        "Transfer the caller to the insurance agent when they insist on speaking with a person, or for urgent/claims matters. Use this when the caller wants to speak with a human.",
      transfer: {
        to_number: opts.callForwardNumber,
        from_number: opts.phoneNumber || opts.callForwardNumber,
      },
    })
  }

  // Add webhook tool if a webhook URL is provided
  if (webhookUrl) {
    tools.push({
      type: "webhook" as const,
      name: "save_caller_info",
      description:
        "Save the collected caller information when the conversation is ending",
      webhook: {
        url: webhookUrl,
        method: "POST" as const,
        body_parameters: {
          type: "object",
          properties: {
            caller_name: {
              type: "string",
              description: "The caller full name",
            },
            callback_number: {
              type: "string",
              description: "Best phone number to call back",
            },
            reason: {
              type: "string",
              description: "Why they are calling (brief summary)",
            },
            callback_time: {
              type: "string",
              description:
                "When the caller prefers to be called back",
            },
            age_range: {
              type: "string",
              description:
                "Caller approximate age if mentioned",
            },
            state: {
              type: "string",
              description:
                "Caller state of residence if mentioned",
            },
            urgency: {
              type: "string",
              description:
                "low, medium, or high based on caller tone and request",
            },
            notes: {
              type: "string",
              description:
                "Any other relevant details from the conversation",
            },
          },
          required: ["caller_name", "reason"],
        },
      },
    })
  }

  if (tools.length > 0) {
    config.tools = tools
  }

  return config
}

/**
 * Build the assistant config for the Spanish-language specialist.
 * Uses the same prompt builder with language: 'es'.
 * The specialist does not get a webhook tool — the main agent handles data collection.
 */
export function buildSpanishSpecialistConfig(
  agentName: string,
  agencyName?: string,
  opts?: {
    greeting?: string | null
    knowledgeBase?: string | null
    businessHours?: string | null
    voice?: string
  },
): TelnyxAssistantCreateDto {
  return {
    name: `Ensurance AI - ${agentName} (Spanish)`,
    model: "Qwen/Qwen3-235B-A22B",
    instructions: buildInboundAgentPrompt({
      agentName,
      businessName: agencyName,
      greeting: opts?.greeting,
      knowledgeBase: opts?.knowledgeBase,
      businessHours: opts?.businessHours,
      language: "es",
    }),
    greeting: `Hola, se ha comunicado con la oficina de ${agentName}. No está disponible en este momento, pero puedo tomar su información para que le devuelva la llamada. ¿En qué le puedo ayudar?`,
    transcription: {
      model: "deepgram/flux",
      language: "es",
    },
    voice_settings: {
      voice: opts?.voice ?? "Telnyx.NaturalHD.vespera",
    },
    telephony_settings: {
      supports_unauthenticated_web_calls: true,
    },
    widget_settings: {
      theme: "light",
    },
    tools: [
      {
        type: "hangup" as const,
        hangup: {
          description:
            "Usa esto para terminar la llamada cuando el usuario se despida o quiera terminar la conversación",
        },
      },
    ],
    enabled_features: ["telephony"],
  }
}

/**
 * Build the public webhook URL for the AI agent.
 * Includes agent_id (user) and ai_agent_id (specific AI agent) as query
 * parameters so the webhook knows which user and agent the call was for.
 */
export function getAIAgentWebhookUrl(
  agentId: string,
  aiAgentId?: string,
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL or VERCEL_URL must be set for AI agent webhooks",
    )
  }

  const url = `${baseUrl}/api/agents/intake-webhook?agent_id=${agentId}`
  return aiAgentId ? `${url}&ai_agent_id=${aiAgentId}` : url
}
