import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
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
import { compileAgentPrompt } from "@/lib/telnyx/prompt-compiler"
import type { CollectFieldId } from "@/lib/types/database"

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
  business_hours: businessHoursSchema.nullable().optional(),
  after_hours_greeting: z.string().max(2000).nullable().optional(),
  collect_fields: z.array(z.enum(collectFieldValues)).optional(),
  post_call_actions: z.array(z.enum(postCallActionValues)).optional(),
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
    const user = await requireUser()
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    const agent = await getAgent(user.id, id)

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const recentCalls = await getAgentCalls(user.id, id, 10)

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
    console.error("GET /api/agents/[id] error:", error)
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
    const user = await requireUser()
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
    const existing = await getAgent(user.id, id)
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
      business_hours,
      after_hours_greeting,
      collect_fields,
      post_call_actions,
    } = parsed.data

    // Update DB first
    const updated = await updateAgent(user.id, id, {
      name,
      description,
      phoneNumber: phone_number,
      greeting,
      personality,
      voice,
      status,
      faqEntries: faq_entries,
      businessHours: business_hours,
      afterHoursGreeting: after_hours_greeting,
      collectFields: collect_fields,
      postCallActions: post_call_actions,
    })

    // Sync to Telnyx if the assistant exists and config changed
    const configChanged =
      name || greeting || personality || voice ||
      faq_entries || business_hours !== undefined ||
      after_hours_greeting !== undefined || collect_fields
    if (existing.telnyx_assistant_id && configChanged) {
      try {
        const agentName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split("@")[0] ||
          "Agent"
        const agencyName = user.user_metadata?.agency_name as string | undefined

        let webhookUrl: string | undefined
        try {
          const url = getAIAgentWebhookUrl(user.id, id)
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
        )

        // Resolve final values: use new values if provided, else existing
        const resolvedGreeting = greeting !== undefined ? greeting : existing.greeting
        const resolvedPersonality = personality !== undefined ? personality : existing.personality
        const resolvedCollectFields: CollectFieldId[] =
          collect_fields ?? (existing.collect_fields as CollectFieldId[]) ??
          ["name", "phone", "reason", "callback_time"]
        const resolvedFaq = faq_entries ?? updated.faq_entries ?? []
        const resolvedHours = business_hours !== undefined ? business_hours : updated.business_hours
        const resolvedAfterGreeting =
          after_hours_greeting !== undefined ? after_hours_greeting : updated.after_hours_greeting

        // Compile the full prompt with all sections
        const compiledPrompt = compileAgentPrompt({
          agentName,
          agencyName,
          personality: resolvedPersonality,
          greeting: resolvedGreeting,
          collectFields: resolvedCollectFields,
          faqEntries: resolvedFaq,
          businessHours: resolvedHours,
          afterHoursGreeting: resolvedAfterGreeting,
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
        await updateAgent(user.id, id, {
          systemPrompt: compiledPrompt,
        })
      } catch (telnyxError) {
        console.error("Telnyx updateAssistant failed:", telnyxError)
        // DB is already updated — log but don't fail the request
      }
    }

    return NextResponse.json({ agent: updated })
  } catch (error) {
    console.error("PUT /api/agents/[id] error:", error)
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
    const user = await requireUser()
    const { id } = await params

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 })
    }

    // Verify ownership
    const existing = await getAgent(user.id, id)
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Delete Telnyx assistant first (ignore errors if already deleted)
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
    await deleteAgent(user.id, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/agents/[id] error:", error)
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 },
    )
  }
}
