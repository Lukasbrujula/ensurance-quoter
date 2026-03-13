import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import {
  getCustomFieldValues,
  upsertCustomFieldValue,
} from "@/lib/supabase/custom-fields"

const upsertSchema = z.object({
  leadId: z.string().uuid(),
  fieldDefinitionId: z.string().uuid(),
  value: z.string().nullable(),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")
    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 })
    }

    const values = await getCustomFieldValues(leadId)
    return NextResponse.json({ values })
  } catch (error) {
    console.error("GET /api/custom-field-values error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to load custom field values" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const parsed = upsertSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.issues },
        { status: 400 },
      )
    }

    await upsertCustomFieldValue(
      parsed.data.leadId,
      parsed.data.fieldDefinitionId,
      parsed.data.value,
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/custom-field-values error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to save custom field value" }, { status: 500 })
  }
}
