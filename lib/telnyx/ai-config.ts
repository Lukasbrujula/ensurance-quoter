/* ------------------------------------------------------------------ */
/*  Telnyx AI Assistant Configuration Builder                           */
/*  Builds the full TelnyxAssistantCreateDto for the insurance agent.   */
/*  Follows TELNYX_WORKING_CONFIG.md exactly — minimal payload.         */
/* ------------------------------------------------------------------ */

import type { TelnyxAssistantCreateDto } from "./ai-types"
import { buildInsuranceIntakePrompt } from "./ai-prompts"

/**
 * Build the full assistant creation payload.
 *
 * CRITICAL RULES (from TELNYX_WORKING_CONFIG.md):
 * - Model MUST be Qwen/Qwen3-235B-A22B (Llama outputs JSON as speech)
 * - Do NOT add hangup tool (breaks WebRTC agents)
 * - Do NOT override Telnyx defaults (voice_speed, noise_suppression, time_limit_secs)
 * - enabled_features: ['telephony'] is REQUIRED for phone/WebRTC
 * - telephony_settings.supports_unauthenticated_web_calls: true for browser test calls
 */
export function buildInsuranceAssistantConfig(
  agentName: string,
  agencyName?: string,
  webhookUrl?: string,
): TelnyxAssistantCreateDto {
  const config: TelnyxAssistantCreateDto = {
    name: `Ensurance AI - ${agentName}`,
    model: "Qwen/Qwen3-235B-A22B",
    instructions: buildInsuranceIntakePrompt(agentName, agencyName),
    greeting: `Hi, you've reached ${agentName}'s office. They're not available right now, but I can take some information so they can call you back. How can I help?`,
    transcription: {
      model: "deepgram/nova-2",
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

  // Only add tools if a webhook URL is provided
  if (webhookUrl) {
    config.tools = [
      {
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
      },
    ]
  }

  return config
}

/**
 * Build the public webhook URL for the AI agent.
 * Includes the agent_id as a query parameter so the webhook
 * knows which agent the call was for.
 */
export function getAIAgentWebhookUrl(agentId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL or VERCEL_URL must be set for AI agent webhooks",
    )
  }

  return `${baseUrl}/api/ai-agent/webhook?agent_id=${agentId}`
}
