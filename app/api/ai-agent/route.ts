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
  getAIAgentSettings,
  updateAIAgentSettings,
} from "@/lib/supabase/settings"
import {
  createAssistant,
  updateAssistant,
  deleteAssistant,
} from "@/lib/telnyx/ai-service"
import {
  buildInsuranceAssistantConfig,
  getAIAgentWebhookUrl,
} from "@/lib/telnyx/ai-config"

/* ------------------------------------------------------------------ */
/*  GET /api/ai-agent — Get current AI agent status                    */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const settings = await getAIAgentSettings(userId)

    return NextResponse.json({
      enabled: settings.enabled,
      assistantId: settings.assistantId,
      hasAssistant: !!settings.assistantId,
    })
  } catch (error) {
    console.error("GET /api/ai-agent error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load AI agent status" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/ai-agent — Create or update the AI assistant             */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const userId = user.id
    const agentName =
      (user.publicMetadata?.full_name as string) ||
      user.firstName ||
      user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "Agent"
    const agencyName = user.publicMetadata?.agency_name as string | undefined

    const settings = await getAIAgentSettings(userId)
    let webhookUrl: string | undefined
    try {
      const url = getAIAgentWebhookUrl(userId)
      if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
        webhookUrl = url
      }
    } catch {
      // Webhook URL not available — agent will work but won't collect data
    }

    if (settings.assistantId) {
      // Update existing assistant
      const config = buildInsuranceAssistantConfig(
        agentName,
        agencyName,
        webhookUrl,
      )
      const assistant = await updateAssistant(settings.assistantId, {
        ...config,
        promote_to_main: true,
      })

      await updateAIAgentSettings(userId, {
        assistantId: assistant.id,
        enabled: true,
      })

      return NextResponse.json({
        success: true,
        assistantId: assistant.id,
        action: "updated",
      })
    }

    // Create new assistant
    const config = buildInsuranceAssistantConfig(
      agentName,
      agencyName,
      webhookUrl,
    )
    const assistant = await createAssistant(config)

    await updateAIAgentSettings(userId, {
      assistantId: assistant.id,
      enabled: true,
    })

    return NextResponse.json({
      success: true,
      assistantId: assistant.id,
      action: "created",
    })
  } catch (error) {
    console.error("POST /api/ai-agent error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to create AI agent" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/ai-agent — Delete the AI assistant                     */
/* ------------------------------------------------------------------ */

export async function DELETE(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const settings = await getAIAgentSettings(userId)

    if (settings.assistantId) {
      try {
        await deleteAssistant(settings.assistantId)
      } catch (error) {
        console.error("Failed to delete Telnyx assistant:", error instanceof Error ? error.message : String(error))
        // Continue — clear local reference even if Telnyx delete fails
      }
    }

    await updateAIAgentSettings(userId, {
      assistantId: null,
      enabled: false,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/ai-agent error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to delete AI agent" },
      { status: 500 },
    )
  }
}
