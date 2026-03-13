import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import { getDashboardLayout, upsertDashboardLayout } from "@/lib/supabase/settings"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"

const layoutSchema = z.object({
  layout: z.array(z.string().min(1).max(50)).min(1).max(20),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const layout = await getDashboardLayout(userId)
    return NextResponse.json({ layout })
  } catch (error) {
    console.error("GET /api/settings/dashboard-layout error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to load layout" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const body = await request.json()
    const parsed = layoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid layout data" }, { status: 400 })
    }

    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    await upsertDashboardLayout(userId, parsed.data.layout)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings/dashboard-layout error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to save layout" }, { status: 500 })
  }
}
