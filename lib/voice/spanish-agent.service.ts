/* ------------------------------------------------------------------ */
/*  Spanish Agent Lifecycle Service                                    */
/*                                                                     */
/*  Manages the Spanish-language companion Telnyx AI assistant.        */
/*  When an agent toggles "Enable Spanish", this service:              */
/*  - Creates a second Telnyx assistant with Spanish prompt + Vespera  */
/*  - Returns the handoff tool config for the primary agent            */
/*  - Syncs updates when the agent config changes                      */
/*  - Deletes the assistant when Spanish is toggled off                */
/*                                                                     */
/*  All Telnyx API calls go through lib/telnyx/ai-service.ts.         */
/* ------------------------------------------------------------------ */

import {
  createAssistant,
  updateAssistant,
  deleteAssistant,
} from "@/lib/telnyx/ai-service"
import { buildSpanishSpecialistConfig } from "@/lib/telnyx/ai-config"
import type { TelnyxTool, TelnyxAssistant } from "@/lib/telnyx/ai-types"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SPANISH_VOICE = "Telnyx.NaturalHD.vespera"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SpanishAgentConfig {
  agentName: string
  agencyName?: string
  greeting?: string | null
  knowledgeBase?: string | null
  businessHours?: string | null
  voice?: string
}

export interface CreateSpanishAgentResult {
  spanishAssistantId: string
  handoffTool: TelnyxTool
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

/**
 * Create a Spanish-language companion assistant on Telnyx.
 * Returns the new assistant ID and the handoff tool config
 * that should be added to the primary agent's tools array.
 */
export async function createSpanishAgent(
  config: SpanishAgentConfig,
): Promise<CreateSpanishAgentResult> {
  const specialistConfig = buildSpanishSpecialistConfig(
    config.agentName,
    config.agencyName,
    {
      greeting: config.greeting,
      knowledgeBase: config.knowledgeBase,
      businessHours: config.businessHours,
      voice: config.voice ?? SPANISH_VOICE,
    },
  )

  const assistant: TelnyxAssistant = await createAssistant(specialistConfig)

  const handoffTool: TelnyxTool = {
    type: "handoff",
    handoff: {
      description:
        "Transfer the caller to a Spanish-speaking specialist when they prefer Spanish",
      ai_assistants: [
        {
          name: "Spanish Agent",
          id: assistant.id,
        },
      ],
    },
  }

  return {
    spanishAssistantId: assistant.id,
    handoffTool,
  }
}

/* ------------------------------------------------------------------ */
/*  Update                                                             */
/* ------------------------------------------------------------------ */

/**
 * Update the existing Spanish assistant with recompiled prompt and config.
 * Call this whenever the primary agent's config changes (name, KB, hours, etc.)
 * so the Spanish assistant stays in sync.
 */
export async function updateSpanishAgent(
  spanishAssistantId: string,
  config: SpanishAgentConfig,
): Promise<void> {
  const specialistConfig = buildSpanishSpecialistConfig(
    config.agentName,
    config.agencyName,
    {
      greeting: config.greeting,
      knowledgeBase: config.knowledgeBase,
      businessHours: config.businessHours,
      voice: config.voice ?? SPANISH_VOICE,
    },
  )

  await updateAssistant(spanishAssistantId, {
    ...specialistConfig,
    promote_to_main: true,
  })
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

/**
 * Delete the Spanish assistant from Telnyx.
 * Call this when Spanish is toggled off or the parent agent is deleted.
 */
export async function deleteSpanishAgent(
  spanishAssistantId: string,
): Promise<void> {
  await deleteAssistant(spanishAssistantId)
}
