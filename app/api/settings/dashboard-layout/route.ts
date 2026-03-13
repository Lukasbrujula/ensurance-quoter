import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import { getDashboardLayout, upsertDashboardLayout } from "@/lib/supabase/settings"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { DEFAULT_ACTIVE_WIDGET_IDS, ALL_WIDGET_IDS } from "@/lib/data/dashboard-widgets"

/**
 * Layout is stored as { active: string[], hidden: string[] }.
 * Old format was a flat string[] — GET normalizes it automatically.
 */

const layoutSchema = z.object({
  active: z.array(z.string().min(1).max(50)).max(30),
  hidden: z.array(z.string().min(1).max(50)).max(30),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const raw = await getDashboardLayout(userId)
    const layout = normalizeLayout(raw)
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

    // Only keep valid widget IDs
    const validIds = new Set(ALL_WIDGET_IDS)
    const active = parsed.data.active.filter((id) => validIds.has(id))
    const hidden = parsed.data.hidden.filter((id) => validIds.has(id))

    await upsertDashboardLayout(userId, { active, hidden })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings/dashboard-layout error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to save layout" }, { status: 500 })
  }
}

/* ------------------------------------------------------------------ */
/*  Backward-compatible normalization                                  */
/* ------------------------------------------------------------------ */

/** Old legacy section IDs that trigger a full reset */
const LEGACY_IDS = new Set(["stats", "activity-followups"])

function normalizeLayout(
  raw: unknown,
): { active: string[]; hidden: string[] } {
  const allIds = new Set(ALL_WIDGET_IDS)
  const defaultActive = [...DEFAULT_ACTIVE_WIDGET_IDS]
  const defaultActiveSet = new Set(defaultActive)
  const defaultHidden = ALL_WIDGET_IDS.filter((id) => !defaultActiveSet.has(id))

  // No saved layout → defaults
  if (!raw || (typeof raw === "object" && raw !== null && !Array.isArray(raw) && !("active" in raw))) {
    return { active: defaultActive, hidden: defaultHidden }
  }

  // Old format: flat string[] → treat all as active, rest as hidden
  if (Array.isArray(raw)) {
    const hasLegacy = raw.some((id) => typeof id === "string" && LEGACY_IDS.has(id))
    if (hasLegacy) {
      return { active: defaultActive, hidden: defaultHidden }
    }

    const validActive = (raw as string[]).filter((id) => allIds.has(id))
    const activeSet = new Set(validActive)
    const hidden = ALL_WIDGET_IDS.filter((id) => !activeSet.has(id))
    return { active: validActive, hidden }
  }

  // New format: { active, hidden }
  const obj = raw as Record<string, unknown>
  if (Array.isArray(obj.active)) {
    const validActive = (obj.active as string[]).filter((id) => allIds.has(id))
    const activeSet = new Set(validActive)
    // Any new widgets not in active or hidden go to hidden
    const hidden = ALL_WIDGET_IDS.filter((id) => !activeSet.has(id))
    return { active: validActive, hidden }
  }

  return { active: defaultActive, hidden: defaultHidden }
}
