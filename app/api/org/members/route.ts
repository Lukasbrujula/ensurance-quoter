import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { checkRateLimit, rateLimiters, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"

/**
 * GET /api/org/members
 *
 * Returns a map of org member data { [userId]: { firstName, lastName, imageUrl, role } }
 * for the caller's active Clerk organization.
 *
 * Requires auth + active orgId. Rate limited.
 */

export interface OrgMember {
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  role: string
}

export type OrgMembersResponse = {
  success: true
  data: Record<string, OrgMember>
} | {
  success: false
  error: string
}

export async function GET(request: Request) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" } satisfies OrgMembersResponse,
      { status: 401 },
    )
  }

  // Rate limit: use general API tier
  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    })

    const members: Record<string, OrgMember> = {}
    for (const m of memberships.data) {
      const uid = m.publicUserData?.userId
      if (!uid) continue
      members[uid] = {
        firstName: m.publicUserData?.firstName ?? null,
        lastName: m.publicUserData?.lastName ?? null,
        imageUrl: m.publicUserData?.imageUrl ?? null,
        role: m.role,
      }
    }

    return NextResponse.json({ success: true, data: members } satisfies OrgMembersResponse)
  } catch (error) {
    console.error("[org/members] Failed to fetch memberships:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch organization members" } satisfies OrgMembersResponse,
      { status: 500 },
    )
  }
}
