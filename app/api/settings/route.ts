import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import { getAgentSettings, upsertAgentSettings } from "@/lib/supabase/settings"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"

const settingsSchema = z.object({
  defaultFirstYearPercent: z.number().min(0).max(150),
  defaultRenewalPercent: z.number().min(0).max(25),
  commissions: z.array(
    z.object({
      carrierId: z.string(),
      carrierName: z.string(),
      firstYearPercent: z.number().min(0).max(150),
      renewalPercent: z.number().min(0).max(25),
    })
  ),
})

const DEFAULT_SETTINGS = {
  defaultFirstYearPercent: 75,
  defaultRenewalPercent: 5,
  commissions: [],
}

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const settings = await getAgentSettings(userId)
    return NextResponse.json(settings ?? DEFAULT_SETTINGS)
  } catch (error) {
    console.error("GET /api/settings error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 }
      )
    }

    const { userId } = await auth()


    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    await upsertAgentSettings(userId, parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}
