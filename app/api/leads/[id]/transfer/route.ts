import { auth, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { insertActivityLog } from "@/lib/supabase/activities"

/**
 * POST /api/leads/[id]/transfer
 *
 * Transfer a lead to another agent within the same org.
 *
 * - Any org member can transfer their OWN leads.
 * - Admins can transfer any org lead.
 * - No approval gate — transfers are immediate.
 * - Activity log entries created for lead timeline and receiver notification.
 */

const transferSchema = z.object({
  targetAgentId: z.string().min(1, "Target agent is required"),
  reason: z.string().max(500).optional(),
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
    return NextResponse.json(
      { error: "Transfers require an active organization" },
      { status: 401 },
    )
  }

  const { id: leadId } = await params

  const body = await request.json()
  const parsed = transferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  const { targetAgentId, reason } = parsed.data

  if (targetAgentId === userId) {
    return NextResponse.json(
      { error: "Cannot transfer a lead to yourself" },
      { status: 400 },
    )
  }

  const supabase = createServiceRoleClient()

  // Verify the lead belongs to this org
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, agent_id, org_id, first_name, last_name")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json(
      { error: "Lead not found in your organization" },
      { status: 404 },
    )
  }

  // Permission: non-admins can only transfer their own leads
  const isAdmin = orgRole === "org:admin"
  if (!isAdmin && lead.agent_id !== userId) {
    return NextResponse.json(
      { error: "You can only transfer leads assigned to you" },
      { status: 403 },
    )
  }

  if (lead.agent_id === targetAgentId) {
    return NextResponse.json(
      { error: "Lead is already assigned to this agent" },
      { status: 400 },
    )
  }

  // Validate target agent is an org member
  let targetName = "Unknown"
  let transferrerName = "Unknown"
  try {
    const client = await clerkClient()
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 500,
    })

    const targetMembership = memberships.data.find(
      (m) => m.publicUserData?.userId === targetAgentId,
    )
    if (!targetMembership) {
      return NextResponse.json(
        { error: "Target agent is not a member of this organization" },
        { status: 400 },
      )
    }

    targetName = [
      targetMembership.publicUserData?.firstName,
      targetMembership.publicUserData?.lastName,
    ].filter(Boolean).join(" ") || "Unknown"

    const transferrerMembership = memberships.data.find(
      (m) => m.publicUserData?.userId === userId,
    )
    if (transferrerMembership) {
      transferrerName = [
        transferrerMembership.publicUserData?.firstName,
        transferrerMembership.publicUserData?.lastName,
      ].filter(Boolean).join(" ") || "Unknown"
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to verify organization membership" },
      { status: 500 },
    )
  }

  // Perform the transfer
  const { error: updateError } = await supabase
    .from("leads")
    .update({ agent_id: targetAgentId })
    .eq("id", leadId)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to transfer lead" },
      { status: 500 },
    )
  }

  const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed"
  const reasonSuffix = reason ? `. Reason: ${reason}` : ""

  // Activity log 1: lead timeline (transferrer's perspective)
  void insertActivityLog({
    leadId,
    agentId: userId,
    orgId,
    activityType: "lead_transferred",
    title: `Lead transferred to ${targetName}${reasonSuffix}`,
    details: {
      from_agent_id: lead.agent_id,
      to_agent_id: targetAgentId,
      from_agent_name: transferrerName,
      to_agent_name: targetName,
      lead_name: leadName,
      reason: reason ?? null,
      transferred_by: userId,
    },
  }, supabase).catch((err) => {
    console.error("[transfer] Failed to log timeline activity:", err)
  })

  // Activity log 2: receiver notification (receiver's agent_id so it shows in their notifications)
  void insertActivityLog({
    leadId,
    agentId: targetAgentId,
    orgId,
    activityType: "lead_transferred",
    title: `Lead transfer from ${transferrerName}: ${leadName}${reasonSuffix}`,
    details: {
      from_agent_id: lead.agent_id,
      to_agent_id: targetAgentId,
      from_agent_name: transferrerName,
      to_agent_name: targetName,
      lead_name: leadName,
      reason: reason ?? null,
      transferred_by: userId,
    },
  }, supabase).catch((err) => {
    console.error("[transfer] Failed to log receiver activity:", err)
  })

  return NextResponse.json({
    success: true,
    data: { leadId, agentId: targetAgentId },
  })
}
