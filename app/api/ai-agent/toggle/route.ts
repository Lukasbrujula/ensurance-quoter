import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import {
  aiAgentLimiter,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import {
  getAIAgentSettings,
  updateAIAgentSettings,
} from "@/lib/supabase/settings"
import { getAssistant } from "@/lib/telnyx/ai-service"

/* ------------------------------------------------------------------ */
/*  PUT /api/ai-agent/toggle — Enable or disable the AI agent          */
/* ------------------------------------------------------------------ */

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = aiAgentLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const user = await requireUser()
    const body = await request.json()
    const enabled = Boolean(body.enabled)

    const settings = await getAIAgentSettings(user.id)

    if (enabled) {
      // Validate assistant exists before enabling
      if (!settings.assistantId) {
        return NextResponse.json(
          { error: "No AI assistant configured. Create one first." },
          { status: 400 },
        )
      }

      // Verify the assistant still exists on Telnyx
      try {
        await getAssistant(settings.assistantId)
      } catch {
        // Assistant was deleted on Telnyx — clear reference
        await updateAIAgentSettings(user.id, {
          assistantId: null,
          enabled: false,
        })
        return NextResponse.json(
          {
            error:
              "AI assistant no longer exists on Telnyx. Please recreate it.",
          },
          { status: 404 },
        )
      }
    }

    await updateAIAgentSettings(user.id, { enabled })

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("PUT /api/ai-agent/toggle error:", error)
    return NextResponse.json(
      { error: "Failed to toggle AI agent" },
      { status: 500 },
    )
  }
}
