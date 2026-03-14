import { auth } from "@clerk/nextjs/server"
import { clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { insertActivityLog } from "@/lib/supabase/activities"

/**
 * POST /api/leads/reassign
 *
 * Reassign a lead to a different agent within the same org.
 * Only org admins (org:admin) can reassign leads.
 *
 * Uses service role client because RLS requires agent_id match
 * for updates — the admin may not own the lead being reassigned.
 * Org membership is validated in application code before using service role.
 */

const reassignSchema = z.object({
  leadId: z.string().uuid(),
  newAgentId: z.string().nullable(),
})

export async function POST(request: Request) {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (orgRole !== "org:admin") {
    return NextResponse.json(
      { error: "Only organization admins can reassign leads" },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = reassignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
  }

  const { leadId, newAgentId } = parsed.data

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
      { status: 404 }
    )
  }

  // If assigning to a specific agent, verify they're in the org
  if (newAgentId) {
    try {
      const client = await clerkClient()
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      })
      const isMember = memberships.data.some(
        (m) => m.publicUserData?.userId === newAgentId
      )
      if (!isMember) {
        return NextResponse.json(
          { error: "Target agent is not a member of this organization" },
          { status: 403 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: "Failed to verify organization membership" },
        { status: 500 }
      )
    }
  }

  const oldAgentId = lead.agent_id

  // Update the lead's agent_id (service role bypasses RLS)
  const { error: updateError } = await supabase
    .from("leads")
    .update({ agent_id: newAgentId })
    .eq("id", leadId)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to reassign lead" },
      { status: 500 }
    )
  }

  // Log the reassignment activity (use service role — admin may not own this lead)
  const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed"
  const title = newAgentId
    ? `Lead reassigned`
    : `Lead unassigned`

  void insertActivityLog({
    leadId,
    agentId: userId,
    orgId,
    activityType: "lead_reassigned",
    title,
    details: {
      from_agent_id: oldAgentId,
      to_agent_id: newAgentId,
      lead_name: leadName,
      reassigned_by: userId,
    },
  }, supabase).catch((err) => {
    console.error("[reassign] Failed to log activity:", err)
  })

  return NextResponse.json({
    success: true,
    data: { leadId, agentId: newAgentId },
  })
}
