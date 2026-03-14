import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import {
  checkRateLimit,
  rateLimiters,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import type {
  AgentOnboardingStatus,
  AgentStatusResponse,
  OnboardingStep,
} from "@/lib/types/agent-status"

/* ------------------------------------------------------------------ */
/*  GET /api/org/agent-status                                          */
/*  Returns onboarding completion status for each org member.          */
/*  Requires auth + orgId + org:admin.                                 */
/* ------------------------------------------------------------------ */

const STEP_DEFINITIONS: { id: string; label: string }[] = [
  { id: "settings", label: "Commission Settings" },
  { id: "licenses", label: "Insurance Licenses" },
  { id: "phone_number", label: "Phone Number" },
  { id: "carriers", label: "Carrier Selection" },
  { id: "first_lead", label: "First Lead" },
  { id: "business_profile", label: "Business Profile" },
]

export async function GET(request: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId || orgRole !== "org:admin") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" } satisfies AgentStatusResponse,
      { status: 401 },
    )
  }

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    // Get org member IDs from Clerk
    const client = await clerkClient()
    const memberships =
      await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100,
      })

    const memberIds = memberships.data
      .map((m) => m.publicUserData?.userId)
      .filter((id): id is string => Boolean(id))

    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {},
      } satisfies AgentStatusResponse)
    }

    // Service role — bypasses RLS so admin can check other agents' setup
    const supabase = createServiceRoleClient()

    // Run all queries in parallel
    const [settingsResult, licensesResult, phonesResult, leadsResult, profilesResult] =
      await Promise.all([
        supabase
          .from("agent_settings")
          .select("user_id, selected_carriers")
          .in("user_id", memberIds),
        supabase
          .from("agent_licenses")
          .select("agent_id")
          .in("agent_id", memberIds),
        supabase
          .from("agent_phone_numbers")
          .select("agent_id")
          .in("agent_id", memberIds),
        supabase
          .from("leads")
          .select("agent_id")
          .in("agent_id", memberIds)
          .eq("org_id", orgId)
          .limit(memberIds.length),
        supabase
          .from("agent_business_profile")
          .select("agent_id, business_name")
          .in("agent_id", memberIds),
      ])

    // Build sets for O(1) lookups
    const settingsSet = new Set(
      (settingsResult.data ?? []).map((r) => r.user_id),
    )
    const carriersSet = new Set(
      (settingsResult.data ?? [])
        .filter(
          (r) =>
            r.selected_carriers !== null &&
            Array.isArray(r.selected_carriers) &&
            (r.selected_carriers as unknown[]).length > 0,
        )
        .map((r) => r.user_id),
    )
    const licensesSet = new Set(
      (licensesResult.data ?? []).map((r) => r.agent_id),
    )
    const phonesSet = new Set(
      (phonesResult.data ?? []).map((r) => r.agent_id),
    )
    const leadsSet = new Set(
      (leadsResult.data ?? []).map((r) => r.agent_id),
    )
    const profilesSet = new Set(
      (profilesResult.data ?? [])
        .filter((r) => r.business_name && r.business_name.trim().length > 0)
        .map((r) => r.agent_id),
    )

    // Build per-member status
    const data: Record<string, AgentOnboardingStatus> = {}

    for (const memberId of memberIds) {
      const completionMap: Record<string, boolean> = {
        settings: settingsSet.has(memberId),
        licenses: licensesSet.has(memberId),
        phone_number: phonesSet.has(memberId),
        carriers: carriersSet.has(memberId),
        first_lead: leadsSet.has(memberId),
        business_profile: profilesSet.has(memberId),
      }

      const steps: OnboardingStep[] = STEP_DEFINITIONS.map((def) => ({
        id: def.id,
        label: def.label,
        completed: completionMap[def.id] ?? false,
      }))

      const completedCount = steps.filter((s) => s.completed).length

      data[memberId] = {
        agentId: memberId,
        completedCount,
        totalSteps: STEP_DEFINITIONS.length,
        steps,
      }
    }

    return NextResponse.json({
      success: true,
      data,
    } satisfies AgentStatusResponse)
  } catch (error) {
    console.error(
      "[org/agent-status] Failed:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch agent status",
      } satisfies AgentStatusResponse,
      { status: 500 },
    )
  }
}
