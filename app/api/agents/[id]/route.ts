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
import {
  getAgent,
  updateAgent,
  deleteAgent,
  getAgentCalls,
} from "@/lib/supabase/ai-agents"
import {
  updateAssistant,
  deleteAssistant,
} from "@/lib/telnyx/ai-service"
import {
  buildInsuranceAssistantConfig,
  getAIAgentWebhookUrl,
} from "@/lib/telnyx/ai-config"
import {
  createSpanishAgent,
  updateSpanishAgent,
  deleteSpanishAgent,
} from "@/lib/voice/spanish-agent.service"
import { compileEnsurancePrompt } from "@/lib/voice/ensurance-prompt-compiler"
import type { TonePreset } from "@/lib/voice/ensurance-prompt-compiler"
import {
  getBusinessProfile,
  buildGlobalKnowledgeBase,
} from "@/lib/supabase/business-profile"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const collectFieldValues = ["name", "phone", "reason", "callback_time", "email", "date_of_birth", "state"] as const
const postCallActionValues = ["save_lead", "book_calendar", "send_notification"] as const

const faqEntrySchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(100),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(1000),
})

const dayHoursSchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
})

const businessHoursSchema = z.object({
  timezone: z.string().min(1).max(100).refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
      } catch {
        return false
      }
    },
    { message: "Invalid IANA timezone" },
  ),
  schedule: z.object({
    monday: dayHoursSchema.nullable(),
    tuesday: dayHoursSchema.nullable(),
    wednesday: dayHoursSchema.nullable(),
    thursday: dayHoursSchema.nullable(),
    friday: dayHoursSchema.nullable(),
    saturday: dayHoursSchema.nullable(),
    sunday: dayHoursSchema.nullable(),
  }),
})

const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  phone_number: z.string().max(30).nullable().optional(),
  greeting: z.string().max(2000).nullable().optional(),
  personality: z.string().max(1000).nullable().optional(),
  voice: z.string().max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  faq_entries: z.array(faqEntrySchema).max(20).optional(),
  knowledge_base: z.string().max(5000).nullable().optional(),
  business_hours: businessHoursSchema.nullable().optional(),
  after_hours_greeting: z.string().max(2000).nullable().optional(),
  collect_fields: z.array(z.enum(collectFieldValues)).optional(),
  post_call_actions: z.array(z.enum(postCallActionValues)).optional(),
  spanish_enabled: z.boolean().optional(),
  call_forward_number: z.string().max(30).nullable().optional(),
  tone_preset: z.string().max(50).nullable().optional(),
  custom_collect_fields: z.array(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500),
    required: z.boolean().optional(),
  })).max(10).optional(),
})

/* ------------------------------------------------------------------ */
/*  GET /api/agents/[id] — Get agent details + recent calls            */
/* ------------------------------------------------------------------ */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    const agent = await getAgent(userId, id)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const recentCalls = await getAgentCalls(userId, id, 10)

    return NextResponse.json({
      agent,
      recentCalls,
      stats: {
        totalCalls: agent.total_calls,
        totalMinutes: agent.total_minutes,
        lastCallAt: agent.last_call_at,
      },
    })
  } catch (error) {
    console.error("GET /api/agents/[id] error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to get agent" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  PUT /api/agents/[id] — Update agent config                         */
/* ------------------------------------------------------------------ */

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const userId = user.id
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateAgentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Verify ownership
    const existing = await getAgent(userId, id)
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const {
      name,
      description,
      phone_number,
      greeting,
      personality,
      voice,
      status,
      faq_entries,
      knowledge_base,
      business_hours,
      after_hours_greeting,
      collect_fields,
      post_call_actions,
      spanish_enabled,
      call_forward_number,
      tone_preset,
      custom_collect_fields,
    } = parsed.data

    // Update DB first
    const updated = await updateAgent(userId, id, {
      name,
      description,
      phoneNumber: phone_number,
      greeting,
      personality,
      voice,
      status,
      faqEntries: faq_entries,
      knowledgeBase: knowledge_base,
      businessHours: business_hours,
      afterHoursGreeting: after_hours_greeting,
      collectFields: collect_fields,
      postCallActions: post_call_actions,
      callForwardNumber: call_forward_number,
      tonePreset: tone_preset,
      customCollectFields: custom_collect_fields,
      spanishEnabled: spanish_enabled,
    })

    // Resolve common values used by both main and specialist sync
    const agentName =
      (user.publicMetadata?.full_name as string | undefined) ||
      user.firstName ||
      user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "Agent"
    const agencyName = user.publicMetadata?.agency_name as string | undefined

    // Resolve final values: use new values if provided, else existing
    const resolvedGreeting = greeting !== undefined ? greeting : existing.greeting
    const resolvedPersonality = personality !== undefined ? personality : existing.personality
    const resolvedFaq = faq_entries ?? updated.faq_entries ?? []
    const resolvedHours = business_hours !== undefined ? business_hours : updated.business_hours
    const resolvedAfterGreeting =
      after_hours_greeting !== undefined ? after_hours_greeting : updated.after_hours_greeting
    const resolvedCollectFields = collect_fields ?? updated.collect_fields ?? ["name", "phone", "reason"]
    const resolvedCustomFields = custom_collect_fields ?? updated.custom_collect_fields ?? []
    const resolvedTonePreset = (tone_preset !== undefined ? tone_preset : updated.tone_preset) as TonePreset | null
    const resolvedCallForward = call_forward_number !== undefined ? call_forward_number : updated.call_forward_number
    const resolvedSpanishEnabled = spanish_enabled !== undefined ? spanish_enabled : updated.spanish_enabled

    // Combine FAQ entries + free-form knowledge base text
    const resolvedKb = knowledge_base !== undefined ? knowledge_base : updated.knowledge_base
    const kbParts: string[] = []
    if (resolvedFaq.length > 0) {
      kbParts.push(
        resolvedFaq
          .map((e) => `Question: ${e.question}\nAnswer: ${e.answer}`)
          .join("\n\n"),
      )
    }
    if (resolvedKb) {
      kbParts.push(resolvedKb)
    }
    let resolvedKnowledgeBase: string | null = kbParts.length > 0 ? kbParts.join("\n\n") : null
    if (resolvedKnowledgeBase && resolvedKnowledgeBase.length > 5000) {
      resolvedKnowledgeBase = resolvedKnowledgeBase.slice(0, 5000)
    }

    // Format business hours into a plain-text string for Spanish config
    let hoursString: string | null = null
    if (resolvedHours) {
      const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
      const lines = DAYS.map((day) => {
        const slot = resolvedHours.schedule[day]
        const label = day.charAt(0).toUpperCase() + day.slice(1)
        return slot ? `${label}: ${slot.open} to ${slot.close}` : `${label}: Closed`
      })
      hoursString = `Timezone: ${resolvedHours.timezone}. ${lines.join(". ")}.`
      if (resolvedAfterGreeting) {
        hoursString += ` If the current time is outside business hours, use this greeting: "${resolvedAfterGreeting}"`
      }
    }

    // ------------------------------------------------------------------
    // Spanish specialist lifecycle
    // ------------------------------------------------------------------
    let spanishAssistantId = existing.spanish_agent_assistant_id
    let spanishSyncWarning: string | null = null

    const spanishConfig = {
      agentName,
      agencyName,
      greeting: resolvedGreeting,
      knowledgeBase: resolvedKnowledgeBase,
      businessHours: hoursString,
      voice: voice ?? existing.voice ?? undefined,
    }

    if (spanish_enabled !== undefined && existing.telnyx_assistant_id) {
      try {
        if (spanish_enabled && !existing.spanish_agent_assistant_id) {
          // Create Spanish specialist assistant
          const result = await createSpanishAgent(spanishConfig)
          spanishAssistantId = result.spanishAssistantId
          await updateAgent(userId, id, {
            spanishAgentAssistantId: result.spanishAssistantId,
          })
        } else if (!spanish_enabled && existing.spanish_agent_assistant_id) {
          // Delete Spanish specialist assistant
          try {
            await deleteSpanishAgent(existing.spanish_agent_assistant_id)
          } catch (delErr) {
            console.error("Failed to delete Spanish specialist:", delErr)
          }
          spanishAssistantId = null
          await updateAgent(userId, id, {
            spanishAgentAssistantId: null,
          })
        }
      } catch (specialistError) {
        console.error("Spanish specialist lifecycle error:", specialistError)
        spanishSyncWarning = "Spanish agent sync failed — you may need to toggle it off and on again."
      }
    }

    // ------------------------------------------------------------------
    // Sync main agent to Telnyx
    // ------------------------------------------------------------------
    let telnyxSyncWarning: string | null = null

    const configChanged =
      name || greeting || personality || voice || tone_preset !== undefined ||
      faq_entries || knowledge_base !== undefined ||
      business_hours !== undefined ||
      after_hours_greeting !== undefined || collect_fields ||
      custom_collect_fields || call_forward_number !== undefined ||
      spanish_enabled !== undefined

    if (existing.telnyx_assistant_id && configChanged) {
      try {
        let webhookUrl: string | undefined
        try {
          const url = getAIAgentWebhookUrl(userId, id)
          if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
            webhookUrl = url
          }
        } catch {
          // Webhook URL not available
        }

        const config = buildInsuranceAssistantConfig(
          agentName,
          agencyName,
          webhookUrl,
          spanishAssistantId ?? undefined,
          {
            callForwardNumber: resolvedCallForward,
            phoneNumber: existing.phone_number,
          },
        )

        // Fetch global business profile for prompt injection
        const businessProfile = await getBusinessProfile(userId)
        const globalKb = buildGlobalKnowledgeBase(businessProfile)

        // Compile full Ensurance prompt with all agent config
        const compiledPrompt = compileEnsurancePrompt({
          agentName,
          businessName: businessProfile.businessName || agencyName,
          greeting: resolvedGreeting,
          personality: resolvedPersonality,
          tonePreset: resolvedTonePreset as TonePreset | null,
          collectFields: resolvedCollectFields,
          customCollectFields: resolvedCustomFields,
          knowledgeBase: [globalKb, resolvedKnowledgeBase].filter(Boolean).join("\n\n") || null,
          faqEntries: resolvedFaq,
          businessHours: resolvedHours,
          afterHoursGreeting: resolvedAfterGreeting,
          spanishEnabled: resolvedSpanishEnabled,
          callForwardNumber: resolvedCallForward,
        })

        config.instructions = compiledPrompt

        if (name) config.name = `Ensurance AI - ${name}`
        if (resolvedGreeting) {
          config.greeting = resolvedGreeting
            .replace(/\{agent\}/g, agentName)
            .replace(/\{business\}/g, agencyName || `${agentName}'s office`)
        }
        if (voice) config.voice_settings = { voice }

        await updateAssistant(existing.telnyx_assistant_id, {
          ...config,
          promote_to_main: true,
        })

        // Store compiled prompt in DB for reference
        await updateAgent(userId, id, {
          systemPrompt: compiledPrompt,
        })
      } catch (telnyxError) {
        const errMsg = telnyxError instanceof Error ? telnyxError.message : String(telnyxError)
        console.error("Telnyx updateAssistant failed:", errMsg)
        telnyxSyncWarning = "Config saved but Telnyx sync failed — your live agent is using the previous config. Try saving again or contact support."
      }
    }

    // Sync Spanish assistant when config changes and Spanish is already active
    if (
      spanishAssistantId &&
      spanish_enabled !== false &&
      configChanged
    ) {
      try {
        await updateSpanishAgent(spanishAssistantId, spanishConfig)
      } catch (syncError) {
        console.error("Spanish specialist sync error:", syncError)
        spanishSyncWarning = spanishSyncWarning ?? "Spanish agent sync failed — the Spanish assistant may be out of date."
      }
    }

    // Build response with optional warnings
    const warnings: string[] = []
    if (telnyxSyncWarning) warnings.push(telnyxSyncWarning)
    if (spanishSyncWarning) warnings.push(spanishSyncWarning)

    return NextResponse.json({
      agent: updated,
      ...(warnings.length > 0 ? { warnings } : {}),
    })
  } catch (error) {
    console.error("PUT /api/agents/[id] error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/agents/[id] — Delete agent + Telnyx cleanup            */
/* ------------------------------------------------------------------ */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    // Verify ownership
    const existing = await getAgent(userId, id)
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Delete Telnyx assistants first (ignore errors if already deleted)
    if (existing.spanish_agent_assistant_id) {
      try {
        await deleteSpanishAgent(existing.spanish_agent_assistant_id)
      } catch (telnyxError) {
        console.error(
          "Telnyx deleteAssistant (Spanish) failed (orphaned):",
          existing.spanish_agent_assistant_id,
          telnyxError,
        )
      }
    }
    if (existing.telnyx_assistant_id) {
      try {
        await deleteAssistant(existing.telnyx_assistant_id)
      } catch (telnyxError) {
        console.error(
          "Telnyx deleteAssistant failed (orphaned):",
          existing.telnyx_assistant_id,
          telnyxError,
        )
      }
    }

    // Delete DB row (cascades to transcripts via FK)
    await deleteAgent(userId, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/agents/[id] error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 },
    )
  }
}
