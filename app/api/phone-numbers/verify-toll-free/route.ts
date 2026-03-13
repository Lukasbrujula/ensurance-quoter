import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { listPhoneNumbers } from "@/lib/supabase/phone-numbers"
import { submitTollFreeVerification } from "@/lib/telnyx/toll-free-verification"

/* ------------------------------------------------------------------ */
/*  POST /api/phone-numbers/verify-toll-free                           */
/*  Submits a toll-free verification request on behalf of the agent.   */
/* ------------------------------------------------------------------ */

const verifySchema = z.object({
  phoneNumberId: z.string().uuid("Invalid phone number ID"),
  businessName: z.string().min(1, "Business name is required").max(200),
  businessEin: z
    .string()
    .regex(/^\d{2}-?\d{7}$/, "EIN must be in XX-XXXXXXX format"),
  businessWebsite: z.string().url().optional().or(z.literal("")),
  useCase: z.string().min(10, "Use case description is required").max(1000),
  sampleMessage: z.string().min(10, "Sample message is required").max(1000),
  optInDescription: z
    .string()
    .min(10, "Opt-in description is required")
    .max(1000),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.auth, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const {
    phoneNumberId,
    businessName,
    businessEin,
    businessWebsite,
    useCase,
    sampleMessage,
    optInDescription,
  } = parsed.data

  try {
    // Verify the agent owns this phone number
    const numbers = await listPhoneNumbers(userId)
    const target = numbers.find((n) => n.id === phoneNumberId)

    if (!target) {
      return NextResponse.json(
        { error: "Phone number not found" },
        { status: 404 },
      )
    }

    if (target.numberType !== "toll_free") {
      return NextResponse.json(
        { error: "Only toll-free numbers require verification" },
        { status: 400 },
      )
    }

    // Normalize EIN to XX-XXXXXXX format
    const normalizedEin = businessEin.includes("-")
      ? businessEin
      : `${businessEin.slice(0, 2)}-${businessEin.slice(2)}`

    await submitTollFreeVerification({
      phoneNumber: target.phoneNumber,
      businessName,
      businessEin: normalizedEin,
      businessWebsite: businessWebsite || undefined,
      useCase,
      sampleMessage,
      optInDescription,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error)
    console.error("[phone-numbers] Toll-free verification error:", raw)

    // Translate provider errors to user-friendly messages
    return NextResponse.json(
      { error: translateVerificationError(raw) },
      { status: 500 },
    )
  }
}

function translateVerificationError(raw: string): string {
  const lower = raw.toLowerCase()

  if (lower.includes("already") && lower.includes("verif")) {
    return "This number already has a pending or completed verification request."
  }
  if (lower.includes("phone_number") || lower.includes("phone number")) {
    return "The phone number could not be verified. Please ensure it is a valid toll-free number."
  }
  if (lower.includes("business") || lower.includes("ein")) {
    return "Verification failed — please check your business name and EIN, then try again."
  }
  if (lower.includes("rate") || lower.includes("limit") || lower.includes("429")) {
    return "Too many requests. Please wait a few minutes and try again."
  }

  return "Verification submission failed. Please check your business details and try again."
}
