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

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  phone_number: z.string().max(30).nullable().optional(),
  greeting: z.string().max(2000).nullable().optional(),
  voice: z.string().max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
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

    const { name, description, phone_number, greeting, voice, status } =
      parsed.data

    // Update DB first
    const updated = await updateAgent(user.id, id, {
      name,
      description,
      phoneNumber: phone_number,
      greeting,
      voice,
      status,
    })

    // Sync to Telnyx if the assistant exists and config changed
    const configChanged = name || greeting || voice
    if (existing.telnyx_assistant_id && configChanged) {
      try {
        const agentName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Agent"
        const agencyName = user.user_metadata?.agency_name

        let webhookUrl: string | undefined
        try {
          webhookUrl = getAIAgentWebhookUrl(user.id, id)
        } catch {
          // Webhook URL not available
        }

        const config = buildInsuranceAssistantConfig(
          agentName,
          agencyName,
          webhookUrl,
        )

        // Apply the updates to the Telnyx config
        if (name) config.name = `Ensurance AI - ${name}`
        if (greeting) config.greeting = greeting
        if (voice) config.voice_settings = { voice }

        await updateAssistant(existing.telnyx_assistant_id, {
          ...config,
          promote_to_main: true,
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
