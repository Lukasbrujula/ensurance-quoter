import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
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
import { getAssistant } from "@/lib/telnyx/ai-service"

/* ------------------------------------------------------------------ */
/*  PUT /api/ai-agent/toggle — Enable or disable the AI agent          */
/* ------------------------------------------------------------------ */

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = z.object({ enabled: z.boolean() }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const { enabled } = parsed.data

    const settings = await getAIAgentSettings(userId)

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
        await updateAIAgentSettings(userId, {
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

    await updateAIAgentSettings(userId, { enabled })

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("PUT /api/ai-agent/toggle error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to toggle AI agent" },
      { status: 500 },
    )
  }
}
