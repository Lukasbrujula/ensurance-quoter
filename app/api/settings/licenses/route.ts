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
  getLicenses,
  addLicense,
  updateLicense,
  deleteLicense,
} from "@/lib/supabase/licenses"

const addSchema = z.object({
  state: z.string().min(1).max(5),
  license_number: z.string().min(1).max(50),
  license_type: z.string().min(1).max(50),
  issue_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  state: z.string().min(1).max(5).optional(),
  license_number: z.string().min(1).max(50).optional(),
  license_type: z.string().min(1).max(50).optional(),
  issue_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
})

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await requireUser()
    const licenses = await getLicenses(user.id)
    return NextResponse.json({ licenses })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch licenses" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = addSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const user = await requireUser()
    const license = await addLicense(user.id, {
      state: parsed.data.state,
      license_number: parsed.data.license_number,
      license_type: parsed.data.license_type,
      issue_date: parsed.data.issue_date ?? null,
      expiration_date: parsed.data.expiration_date ?? null,
    })
    return NextResponse.json({ license })
  } catch (error) {
    console.error("[licenses] POST error:", error)
    return NextResponse.json({ error: "Failed to add license" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    )
  }

  try {
    const user = await requireUser()
    const { id, ...updates } = parsed.data
    const license = await updateLicense(user.id, id, updates)
    return NextResponse.json({ license })
  } catch (error) {
    console.error("[licenses] PUT error:", error)
    return NextResponse.json({ error: "Failed to update license" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    const user = await requireUser()
    await deleteLicense(user.id, parsed.data.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[licenses] DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete license" }, { status: 500 })
  }
}
