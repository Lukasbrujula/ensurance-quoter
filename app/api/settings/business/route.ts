import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import { getBusinessInfo, upsertBusinessInfo } from "@/lib/supabase/settings"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"

const businessInfoSchema = z.object({
  companyName: z.string().max(200),
  address: z.string().max(300),
  city: z.string().max(100),
  state: z.string().max(2),
  zipCode: z.string().max(10),
  businessType: z.string().max(100),
  ein: z.string().max(20),
  eoInsurance: z.string().max(200),
  eoExpiry: z.string().max(10),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await requireUser()
    const info = await getBusinessInfo(user.id)
    return NextResponse.json(info)
  } catch {
    return NextResponse.json(
      { error: "Failed to load business information" },
      { status: 500 },
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
    const parsed = businessInfoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid business information" },
        { status: 400 },
      )
    }

    const user = await requireUser()
    await upsertBusinessInfo(user.id, parsed.data)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to save business information" },
      { status: 500 },
    )
  }
}
