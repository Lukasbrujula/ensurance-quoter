import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import {
  getBusinessProfile,
  upsertBusinessProfile,
} from "@/lib/supabase/business-profile"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const faqEntrySchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(100),
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(1000),
})

const businessProfileSchema = z.object({
  businessName: z.string().max(200),
  knowledgeBase: z.string().max(2000),
  faq: z.array(faqEntrySchema).max(20),
})

/* ------------------------------------------------------------------ */
/*  GET                                                                */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await requireUser()
    const profile = await getBusinessProfile(user.id)
    return NextResponse.json(profile)
  } catch {
    return NextResponse.json(
      { error: "Failed to load business profile" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  PUT                                                                */
/* ------------------------------------------------------------------ */

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const body = await request.json()
    const parsed = businessProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid business profile", details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const user = await requireUser()
    await upsertBusinessProfile(user.id, parsed.data)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to save business profile" },
      { status: 500 },
    )
  }
}
