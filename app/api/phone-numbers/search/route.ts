import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { searchAvailableNumbers } from "@/lib/telnyx/phone-numbers"

/* ------------------------------------------------------------------ */
/*  POST /api/phone-numbers/search — search available Telnyx numbers   */
/* ------------------------------------------------------------------ */

const searchSchema = z.object({
  state: z.string().max(2).optional(),
  areaCode: z.string().max(6).optional(),
  city: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(50).optional(),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = searchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  try {
    const available = await searchAvailableNumbers(parsed.data)
    const numbers = available.map((n) => ({
      phoneNumber: n.phone_number,
      city: n.region_information?.[0]?.region_name ?? null,
      state: n.region_information?.find((r) => r.region_type === "state")?.region_name ?? null,
      monthlyRate: n.cost_information?.monthly_cost ?? "1.00",
    }))

    return NextResponse.json({ numbers })
  } catch (error) {
    console.error("[phone-numbers] Search error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to search phone numbers" },
      { status: 500 },
    )
  }
}
