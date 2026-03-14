import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
import {
  listPhoneNumbers,
  listOrgPhoneNumbers,
  listAssignedPhoneNumbers,
} from "@/lib/supabase/phone-numbers"
import { createServiceRoleClient } from "@/lib/supabase/server"

/* ------------------------------------------------------------------ */
/*  GET /api/phone-numbers — list agent's phone numbers                */
/*  Admin in team mode: returns all org numbers.                       */
/*  Non-admin in team mode: owned + assigned numbers.                  */
/*  Solo: owned numbers only (current behavior).                       */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId, orgId, orgRole } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    // Admin in team mode: all org numbers
    if (orgId && orgRole === "org:admin") {
      const serviceClient = createServiceRoleClient()
      const numbers = await listOrgPhoneNumbers(orgId, serviceClient)
      return NextResponse.json({ numbers })
    }

    // Non-admin in team mode: owned + assigned numbers (deduplicated)
    if (orgId) {
      const [owned, assigned] = await Promise.all([
        listPhoneNumbers(userId),
        listAssignedPhoneNumbers(userId),
      ])
      const seenIds = new Set(owned.map((n) => n.id))
      const merged = [...owned]
      for (const num of assigned) {
        if (!seenIds.has(num.id)) {
          merged.push(num)
        }
      }
      return NextResponse.json({ numbers: merged })
    }

    // Solo: owned numbers only
    const numbers = await listPhoneNumbers(userId)
    return NextResponse.json({ numbers })
  } catch (error) {
    console.error("[phone-numbers] GET error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to list phone numbers" },
      { status: 500 },
    )
  }
}
