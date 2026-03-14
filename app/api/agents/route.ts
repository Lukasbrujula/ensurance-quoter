import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth, currentUser } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { listAgents, createAgent } from "@/lib/supabase/ai-agents"
import { getExtractionStatsByUser } from "@/lib/supabase/calls"
import {
  createAssistant,
} from "@/lib/telnyx/ai-service"
import {
  buildInsuranceAssistantConfig,
  getAIAgentWebhookUrl,
} from "@/lib/telnyx/ai-config"
import { getTemplateById, resolveGreeting } from "@/lib/telnyx/agent-templates"
import { sanitizePromptInput } from "@/lib/telnyx/prompt-compiler"
import { compileEnsurancePrompt } from "@/lib/voice/ensurance-prompt-compiler"
import type { TonePreset } from "@/lib/voice/ensurance-prompt-compiler"
import {
  getBusinessProfile,
  buildGlobalKnowledgeBase,
} from "@/lib/supabase/business-profile"
import type { CollectFieldId, PostCallActionId } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const collectFieldValues = ["name", "phone", "reason", "callback_time", "email", "date_of_birth", "state"] as const
const postCallActionValues = ["save_lead", "book_calendar", "send_notification"] as const

const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  phone_number: z.string().max(30).optional(),
  greeting: z.string().max(2000).optional(),
  personality: z.string().max(1000).optional(),
  voice: z.string().max(100).optional(),
  template_id: z.string().max(50).optional(),
  collect_fields: z.array(z.enum(collectFieldValues)).optional(),
  post_call_actions: z.array(z.enum(postCallActionValues)).optional(),
  /** Business name from wizard — used for prompt compilation, not persisted separately */
  business_name: z.string().max(200).optional(),
  /** Tone preset ID from wizard — used for prompt compilation, not persisted separately */
  tone_preset: z.string().max(50).optional(),
  /** User-edited system prompt — skips server-side recompilation if provided */
  custom_prompt: z.string().max(20000).optional(),
  /** User-edited greeting — uses this instead of template greeting resolution */
  custom_greeting: z.string().max(2000).optional(),
})

/* ------------------------------------------------------------------ */
/*  GET /api/agents — List all AI agents for the current user          */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const [agents, extractionStats] = await Promise.all([
      listAgents(userId),
      getExtractionStatsByUser(userId),
    ])

    return NextResponse.json({ agents, extractionStats })
  } catch (error) {
    console.error("GET /api/agents error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to list agents" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/agents — Create a new AI agent                           */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { has, orgId, orgRole } = await auth()
    const user = await currentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })

    if (has && !has({ feature: "ai_voice_agents" })) {
      return Response.json(
        { error: "This feature requires a Pro plan. Upgrade at /pricing." },
        { status: 403 },
      )
    }

    if (orgId && orgRole !== "org:admin") {
      return Response.json(
        { error: "Only organization admins can create AI agents" },
        { status: 403 },
      )
    }

    const userId = user.id
    const body = await request.json()
    const parsed = createAgentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const {
      name,
      description,
      phone_number,
      greeting,
      personality,
      voice,
      template_id,
      collect_fields,
      post_call_actions,
      business_name,
      tone_preset,
      custom_prompt,
      custom_greeting,
    } = parsed.data

    // Resolve agent name for prompt compilation
    const agentName =
      (user.publicMetadata?.full_name as string | undefined) ||
      user.firstName ||
      user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "Agent"
    // business_name from wizard takes priority over profile metadata
    const agencyName =
      business_name ||
      (user.publicMetadata?.brokerage_name as string | undefined) ||
      (user.publicMetadata?.agency_name as string | undefined)

    // Resolve template defaults if selected
    const template = template_id ? getTemplateById(template_id) : undefined

    const resolvedGreeting = greeting ?? (template ? template.greeting : undefined)
    const resolvedPersonality = personality ?? (template ? template.personality : undefined)
    const resolvedCollectFields: CollectFieldId[] =
      collect_fields ?? (template ? [...template.collectFields] : ["name", "phone", "reason", "callback_time"])
    const resolvedPostCallActions: PostCallActionId[] =
      post_call_actions ?? (template ? [...template.postCallActions] : ["save_lead", "book_calendar", "send_notification"])

    // 1. Create DB row first (status: 'inactive')
    const agent = await createAgent({
      agentId: userId,
      orgId: orgId ?? null,
      name,
      description,
      phoneNumber: phone_number,
      greeting: resolvedGreeting,
      personality: resolvedPersonality,
      voice,
      status: "inactive",
      collectFields: resolvedCollectFields,
      postCallActions: resolvedPostCallActions,
    })

    // 2. Create Telnyx assistant with compiled prompt
    try {
      let webhookUrl: string | undefined
      try {
        const url = getAIAgentWebhookUrl(userId, agent.id)
        // Telnyx rejects non-public URLs — skip webhook for localhost
        if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
          webhookUrl = url
        }
      } catch {
        // Webhook URL not available — agent will work but won't collect data
      }

      const config = buildInsuranceAssistantConfig(
        agentName,
        agencyName,
        webhookUrl,
      )

      // Fetch global business profile for prompt injection
      const businessProfile = await getBusinessProfile(userId)
      const globalKb = buildGlobalKnowledgeBase(businessProfile)

      // Use custom prompt if provided, otherwise compile full Ensurance prompt
      // (same compiler as the PUT handler — applies tone, fields, hours, etc.)
      const compiledPrompt = custom_prompt
        ? sanitizePromptInput(custom_prompt)
        : compileEnsurancePrompt({
            agentName,
            businessName: businessProfile.businessName || agencyName,
            greeting: resolvedGreeting,
            personality: resolvedPersonality,
            tonePreset: (tone_preset ?? null) as TonePreset | null,
            collectFields: resolvedCollectFields,
            knowledgeBase: globalKb || null,
            businessHours: null,
            afterHoursGreeting: null,
          })

      config.instructions = compiledPrompt

      // Resolve greeting — custom_greeting takes priority
      if (custom_greeting) {
        config.greeting = sanitizePromptInput(custom_greeting)
      } else if (resolvedGreeting && template) {
        config.greeting = resolveGreeting(template, agentName, agencyName)
      } else if (resolvedGreeting) {
        config.greeting = resolvedGreeting
          .replace(/\{agent\}/g, agentName)
          .replace(/\{business\}/g, agencyName || `${agentName}'s office`)
      }

      if (voice) {
        config.voice_settings = { voice }
      }
      config.name = `Ensurance AI - ${name}`

      const assistant = await createAssistant(config)

      // 3. Update DB row with Telnyx assistant ID + compiled prompt
      const { updateAgent } = await import("@/lib/supabase/ai-agents")
      const updatedAgent = await updateAgent(userId, agent.id, {
        telnyxAssistantId: assistant.id,
        systemPrompt: compiledPrompt,
        status: "active",
      })

      // Link phone number to this agent
      if (phone_number) {
        try {
          const { getPhoneNumberByNumber, updatePhoneNumber } = await import("@/lib/supabase/phone-numbers")
          const phoneRecord = await getPhoneNumberByNumber(phone_number)
          if (phoneRecord && phoneRecord.agentId === userId) {
            await updatePhoneNumber(userId, phoneRecord.id, { aiAgentId: agent.id })
          }
        } catch (linkError) {
          console.error("Failed to link phone number:", linkError)
        }
      }

      return NextResponse.json({ agent: updatedAgent }, { status: 201 })
    } catch (telnyxError) {
      console.error("Telnyx createAssistant failed:", telnyxError)
      // Keep the DB row with status 'error'
      const { updateAgent } = await import("@/lib/supabase/ai-agents")
      const errorAgent = await updateAgent(userId, agent.id, {
        status: "error",
      })

      return NextResponse.json(
        {
          agent: errorAgent,
          warning: "Agent created but Telnyx setup failed. You can retry from the agent detail page.",
        },
        { status: 201 },
      )
    }
  } catch (error) {
    console.error("POST /api/agents error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    )
  }
}
