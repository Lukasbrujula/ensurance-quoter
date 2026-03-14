import { NextResponse } from "next/server"
import { z } from "zod"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { assignPhoneNumber } from "@/lib/supabase/phone-numbers"

/* ------------------------------------------------------------------ */
/*  POST /api/phone-numbers/[id]/assign                                */
/*  Assigns a phone number to a team agent.                            */
/*  Requires auth + orgId + org:admin role.                            */
/* ------------------------------------------------------------------ */

const assignSchema = z.object({
  agentId: z.string().min(1).nullable(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (orgRole !== "org:admin") {
    return NextResponse.json(
      { error: "Only admins can assign phone numbers" },
      { status: 403 },
    )
  }

  const { id } = await params
  const body: unknown = await request.json().catch(() => null)
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  const { agentId: targetAgentId } = parsed.data

  try {
    const serviceClient = createServiceRoleClient()

    // Verify the phone number belongs to this org
    const { data: phoneNumber, error: lookupError } = await serviceClient
      .from("agent_phone_numbers")
      .select("id, org_id")
      .eq("id", id)
      .maybeSingle()

    if (lookupError || !phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 })
    }

    if (phoneNumber.org_id !== orgId) {
      return NextResponse.json({ error: "Phone number not in your organization" }, { status: 403 })
    }

    // If assigning (not unassigning), verify target agent is in the same org
    if (targetAgentId) {
      const client = await clerkClient()
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 500,
      })

      const isMember = memberships.data.some(
        (m) => m.publicUserData?.userId === targetAgentId,
      )

      if (!isMember) {
        return NextResponse.json(
          { error: "Target agent is not a member of this organization" },
          { status: 400 },
        )
      }
    }

    const updated = await assignPhoneNumber(id, targetAgentId, serviceClient)
    return NextResponse.json({ number: updated })
  } catch (error) {
    console.error(
      "[phone-numbers/assign] Error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to assign phone number" },
      { status: 500 },
    )
  }
}
