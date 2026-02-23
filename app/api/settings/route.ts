import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import { getAgentSettings, upsertAgentSettings } from "@/lib/supabase/settings"
import { settingsLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"

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

  const rl = settingsLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const user = await requireUser()
    const settings = await getAgentSettings(user.id)
    return NextResponse.json(settings ?? DEFAULT_SETTINGS)
  } catch (error) {
    console.error("GET /api/settings error:", error)
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = settingsLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const parsed = settingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid settings data" },
        { status: 400 }
      )
    }

    const user = await requireUser()
    await upsertAgentSettings(user.id, parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings error:", error)
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}
