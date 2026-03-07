import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
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

const dayScheduleSchema = z.object({
  open: z.boolean(),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
})

const businessHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
})

const businessProfileSchema = z.object({
  businessName: z.string().max(200),
  knowledgeBase: z.string().max(5000),
  faq: z.array(faqEntrySchema).max(20),
  businessHours: businessHoursSchema.optional(),
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
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const profile = await getBusinessProfile(userId)
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

    const { userId } = await auth()


    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    await upsertBusinessProfile(userId, parsed.data)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Failed to save business profile" },
      { status: 500 },
    )
  }
}
