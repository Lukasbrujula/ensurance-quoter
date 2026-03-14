import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import {
  getCustomFieldDefinitions,
  createCustomFieldDefinition,
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
  reorderCustomFieldDefinitions,
} from "@/lib/supabase/custom-fields"
import { nameToKey, isReservedFieldKey, MAX_CUSTOM_FIELDS } from "@/lib/types/custom-fields"

const createSchema = z.object({
  fieldName: z.string().min(1).max(50),
  fieldType: z.enum(["text", "number", "date", "select", "boolean"]),
  options: z.array(z.string().min(1).max(100)).max(50).optional(),
  isRequired: z.boolean().optional(),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  fieldName: z.string().min(1).max(50).optional(),
  fieldType: z.enum(["text", "number", "date", "select", "boolean"]).optional(),
  options: z.array(z.string().min(1).max(100)).max(50).nullable().optional(),
  isRequired: z.boolean().optional(),
})

const deleteSchema = z.object({
  id: z.string().uuid(),
})

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const definitions = await getCustomFieldDefinitions(userId)
    return NextResponse.json({ definitions })
  } catch (error) {
    console.error("GET /api/settings/custom-fields error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to load custom fields" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId, orgId, orgRole, has } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (has && !has({ feature: "custom_lead_fields" })) {
      return NextResponse.json(
        { error: "This feature requires a Pro plan. Upgrade at /pricing." },
        { status: 403 },
      )
    }

    if (orgId && orgRole !== "org:admin") {
      return NextResponse.json(
        { error: "Only organization admins can manage custom fields" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid field data", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const fieldKey = nameToKey(parsed.data.fieldName)
    if (!fieldKey) {
      return NextResponse.json({ error: "Field name produces an empty key" }, { status: 400 })
    }

    if (isReservedFieldKey(fieldKey)) {
      return NextResponse.json(
        { error: "This field name conflicts with a standard lead field" },
        { status: 400 },
      )
    }

    const existing = await getCustomFieldDefinitions(userId)
    if (existing.length >= MAX_CUSTOM_FIELDS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_CUSTOM_FIELDS} custom fields allowed` },
        { status: 400 },
      )
    }

    const nextOrder = existing.length > 0
      ? Math.max(...existing.map((f) => f.displayOrder)) + 1
      : 0

    const definition = await createCustomFieldDefinition(userId, {
      fieldName: parsed.data.fieldName,
      fieldKey,
      fieldType: parsed.data.fieldType,
      options: parsed.data.fieldType === "select" ? (parsed.data.options ?? null) : null,
      isRequired: parsed.data.isRequired,
      displayOrder: nextOrder,
    })

    return NextResponse.json({ definition }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create custom field"
    console.error("POST /api/settings/custom-fields error:", message)
    const status = message.includes("already exists") ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId, orgId, orgRole, has } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (has && !has({ feature: "custom_lead_fields" })) {
      return NextResponse.json(
        { error: "This feature requires a Pro plan. Upgrade at /pricing." },
        { status: 403 },
      )
    }

    if (orgId && orgRole !== "org:admin") {
      return NextResponse.json(
        { error: "Only organization admins can manage custom fields" },
        { status: 403 },
      )
    }

    const body = await request.json()

    // Reorder request
    if ("orderedIds" in body) {
      const parsed = reorderSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid reorder data" }, { status: 400 })
      }
      await reorderCustomFieldDefinitions(parsed.data.orderedIds)
      return NextResponse.json({ success: true })
    }

    // Update request
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update data" }, { status: 400 })
    }

    const { id, ...updates } = parsed.data
    await updateCustomFieldDefinition(id, updates)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings/custom-fields error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId, orgId, orgRole, has } = await auth()
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    if (has && !has({ feature: "custom_lead_fields" })) {
      return NextResponse.json(
        { error: "This feature requires a Pro plan. Upgrade at /pricing." },
        { status: 403 },
      )
    }

    if (orgId && orgRole !== "org:admin") {
      return NextResponse.json(
        { error: "Only organization admins can manage custom fields" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid delete data" }, { status: 400 })
    }

    await deleteCustomFieldDefinition(parsed.data.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/settings/custom-fields error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 })
  }
}
