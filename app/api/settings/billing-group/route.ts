import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { currentUser } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { getBillingGroupId, setBillingGroupId } from "@/lib/supabase/settings"
import { createBillingGroup, getBillingGroup } from "@/lib/telnyx/billing"
import type { TelnyxBillingGroup } from "@/lib/telnyx/billing"

/* ------------------------------------------------------------------ */
/*  GET /api/settings/billing-group                                    */
/*  Returns billing group status. If none exists (webhook failed),     */
/*  creates one as fallback — ensures every agent gets a billing group.*/
/* ------------------------------------------------------------------ */

interface BillingGroupStatus {
  status: "active" | "provisioning" | "not_configured"
  billingGroupId: string | null
  name: string | null
  createdAt: string | null
}

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Check if billing group ID already stored in DB
    const existingId = await getBillingGroupId(userId)

    if (existingId) {
      // Verify it still exists on Telnyx
      try {
        const group = await getBillingGroup(existingId)
        const response: BillingGroupStatus = {
          status: "active",
          billingGroupId: group.id,
          name: group.name,
          createdAt: group.created_at,
        }
        return NextResponse.json(response)
      } catch {
        // Billing group was deleted on Telnyx — fall through to re-create
      }
    }

    // Fallback: no billing group or it was deleted — create one now
    const user = await currentUser()
    const displayName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ") || user?.emailAddresses?.[0]?.emailAddress || userId

    let group: TelnyxBillingGroup
    try {
      group = await createBillingGroup(`Ensurance - ${displayName}`)
    } catch (err) {
      console.error(
        "[billing-group] Fallback creation failed:",
        err instanceof Error ? err.message : String(err),
      )
      const response: BillingGroupStatus = {
        status: "not_configured",
        billingGroupId: null,
        name: null,
        createdAt: null,
      }
      return NextResponse.json(response)
    }

    // Store the new billing group ID
    await setBillingGroupId(userId, group.id)

    const response: BillingGroupStatus = {
      status: "active",
      billingGroupId: group.id,
      name: group.name,
      createdAt: group.created_at,
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error(
      "[billing-group] Error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to load billing group status" },
      { status: 500 },
    )
  }
}
