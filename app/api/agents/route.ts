import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import {
  agentsLimiter,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { listAgents, createAgent } from "@/lib/supabase/ai-agents"
import {
  createAssistant,
} from "@/lib/telnyx/ai-service"
import {
  buildInsuranceAssistantConfig,
  getAIAgentWebhookUrl,
} from "@/lib/telnyx/ai-config"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  phone_number: z.string().max(30).optional(),
  greeting: z.string().max(2000).optional(),
  voice: z.string().max(100).optional(),
})

/* ------------------------------------------------------------------ */
/*  GET /api/agents — List all AI agents for the current user          */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = agentsLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const user = await requireUser()
    const agents = await listAgents(user.id)

    return NextResponse.json({ agents })
  } catch (error) {
    console.error("GET /api/agents error:", error)
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

  const rl = agentsLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const user = await requireUser()
    const body = await request.json()
    const parsed = createAgentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { name, description, phone_number, greeting, voice } = parsed.data

    // 1. Create DB row first (status: 'inactive')
    const agent = await createAgent({
      agentId: user.id,
      name,
      description,
      phoneNumber: phone_number,
      greeting,
      voice,
      status: "inactive",
    })

    // 2. Create Telnyx assistant
    try {
      const agentName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Agent"
      const agencyName = user.user_metadata?.agency_name

      let webhookUrl: string | undefined
      try {
        webhookUrl = getAIAgentWebhookUrl(user.id, agent.id)
      } catch {
        // Webhook URL not available — agent will work but won't collect data
      }

      const config = buildInsuranceAssistantConfig(
        agentName,
        agencyName,
        webhookUrl,
      )

      // Override greeting and voice if provided
      if (greeting) {
        config.greeting = greeting
      }
      if (voice) {
        config.voice_settings = { voice }
      }
      config.name = `Ensurance AI - ${name}`

      const assistant = await createAssistant(config)

      // 3. Update DB row with Telnyx assistant ID
      const { updateAgent } = await import("@/lib/supabase/ai-agents")
      const updatedAgent = await updateAgent(user.id, agent.id, {
        telnyxAssistantId: assistant.id,
        systemPrompt: config.instructions,
        status: "active",
      })

      return NextResponse.json({ agent: updatedAgent }, { status: 201 })
    } catch (telnyxError) {
      console.error("Telnyx createAssistant failed:", telnyxError)
      // Keep the DB row with status 'error'
      const { updateAgent } = await import("@/lib/supabase/ai-agents")
      const errorAgent = await updateAgent(user.id, agent.id, {
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
    console.error("POST /api/agents error:", error)
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    )
  }
}
