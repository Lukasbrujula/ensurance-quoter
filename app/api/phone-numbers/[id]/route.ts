import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { requireUser } from "@/lib/supabase/auth-server"
import {
  updatePhoneNumber,
  deletePhoneNumber,
  listPhoneNumbers,
} from "@/lib/supabase/phone-numbers"
import { releasePhoneNumber } from "@/lib/telnyx/phone-numbers"

/* ------------------------------------------------------------------ */
/*  PUT /api/phone-numbers/[id] — update a phone number                */
/* ------------------------------------------------------------------ */

const updateSchema = z.object({
  label: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
  aiAgentId: z.string().uuid().nullable().optional(),
  smsEnabled: z.boolean().optional(),
  voiceEnabled: z.boolean().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { id } = await params
  const body: unknown = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  try {
    const user = await requireUser()
    const updated = await updatePhoneNumber(user.id, id, parsed.data)
    return NextResponse.json({ number: updated })
  } catch (error) {
    console.error("[phone-numbers] PUT error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE /api/phone-numbers/[id] — release + delete a phone number   */
/* ------------------------------------------------------------------ */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.auth, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { id } = await params

  try {
    const user = await requireUser()

    // Look up the number to get its Telnyx ID
    const numbers = await listPhoneNumbers(user.id)
    const target = numbers.find((n) => n.id === id)
    if (!target) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    // Release on Telnyx if we have the ID
    if (target.telnyxPhoneNumberId) {
      try {
        await releasePhoneNumber(target.telnyxPhoneNumberId)
      } catch {
        // Continue with DB deletion even if Telnyx release fails
      }
    }

    // Delete from DB
    await deletePhoneNumber(user.id, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[phone-numbers] DELETE error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to delete phone number" },
      { status: 500 },
    )
  }
}
