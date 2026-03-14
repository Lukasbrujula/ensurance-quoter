import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import { getSelectedCarriers, upsertSelectedCarriers, getOrgAdminCarriers } from "@/lib/supabase/settings"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"

const carriersSchema = z.object({
  selectedCarriers: z.array(
    z.string().regex(/^[A-Z]{4}$/, "CompCode must be 4 uppercase letters"),
  ).min(1).max(200).nullable(),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId, orgId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // In team context, resolve org-level carriers (admin's settings)
    const selectedCarriers = orgId
      ? await getOrgAdminCarriers(orgId)
      : await getSelectedCarriers(userId)
    return NextResponse.json({ selectedCarriers })
  } catch (error) {
    console.error("GET /api/settings/carriers error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load carrier settings" },
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
    const body: unknown = await request.json()
    const parsed = carriersSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid carrier selection", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { userId, orgId, orgRole } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    if (orgId && orgRole !== "org:admin") {
      return NextResponse.json(
        { error: "Only organization admins can change carrier selection" },
        { status: 403 },
      )
    }

    await upsertSelectedCarriers(userId, parsed.data.selectedCarriers)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings/carriers error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to save carrier settings" },
      { status: 500 },
    )
  }
}
