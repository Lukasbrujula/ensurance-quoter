import { NextResponse } from "next/server"
import { Webhook } from "svix"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type { DbClient } from "@/lib/supabase/server"
import { createBillingGroup } from "@/lib/telnyx/billing"
import type { Json } from "@/lib/types/database.generated"

/* ------------------------------------------------------------------ */
/*  POST /api/webhooks/clerk — Clerk webhook receiver                  */
/*  Auth: Svix signature verification (Standard Webhooks spec).        */
/*  Handles:                                                           */
/*  - user.created → creates Telnyx billing group for agent            */
/*  - organizationMembership.deleted → unassigns removed agent's data  */
/* ------------------------------------------------------------------ */

interface ClerkUserPayload {
  id: string
  first_name: string | null
  last_name: string | null
  email_addresses: Array<{
    email_address: string
  }>
}

interface ClerkOrgMembershipPayload {
  id: string
  organization: {
    id: string
    name: string
  }
  public_user_data: {
    user_id: string
    first_name: string | null
    last_name: string | null
  }
  role: string
}

interface ClerkWebhookEvent {
  type: string
  data: ClerkUserPayload | ClerkOrgMembershipPayload
}

const HANDLED_EVENTS = new Set(["user.created", "organizationMembership.deleted"])

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    console.error("[webhooks/clerk] CLERK_WEBHOOK_SECRET is not configured")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  // Read raw body for signature verification
  const rawBody = await request.text()

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 })
  }

  // Verify webhook signature
  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error("[webhooks/clerk] Signature verification failed:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  // Acknowledge unhandled event types
  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  if (event.type === "user.created") {
    await handleUserCreated(event.data as ClerkUserPayload)
  }

  if (event.type === "organizationMembership.deleted") {
    await handleMembershipDeleted(event.data as ClerkOrgMembershipPayload)
  }

  // Always return 200 after signature verification passes
  return NextResponse.json({ received: true }, { status: 200 })
}

/* ------------------------------------------------------------------ */
/*  user.created → Telnyx billing group                                */
/* ------------------------------------------------------------------ */

async function handleUserCreated(data: ClerkUserPayload): Promise<void> {
  const { id: userId, first_name, last_name, email_addresses } = data
  const displayName = [first_name, last_name].filter(Boolean).join(" ") || email_addresses?.[0]?.email_address || userId

  try {
    const billingGroup = await createBillingGroup(`Ensurance - ${displayName}`)

    const supabase = createServiceRoleClient()
    const { error } = await supabase.from("agent_settings").upsert(
      {
        user_id: userId,
        telnyx_billing_group_id: billingGroup.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (error) {
      console.error("[webhooks/clerk] Failed to store billing group ID:", error.message)
    }
  } catch (err) {
    // Log but do NOT block the webhook response — BG-03 fallback will catch this
    console.error("[webhooks/clerk] Billing group creation failed:", err instanceof Error ? err.message : String(err))
  }
}

/* ------------------------------------------------------------------ */
/*  organizationMembership.deleted → unassign agent's leads + numbers  */
/* ------------------------------------------------------------------ */

async function handleMembershipDeleted(data: ClerkOrgMembershipPayload): Promise<void> {
  const removedUserId = data.public_user_data.user_id
  const orgId = data.organization.id
  const agentName = [data.public_user_data.first_name, data.public_user_data.last_name]
    .filter(Boolean)
    .join(" ") || removedUserId

  const supabase = createServiceRoleClient()

  try {
    // 1. Find all leads belonging to the removed agent in this org
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, first_name, last_name")
      .eq("agent_id", removedUserId)
      .eq("org_id", orgId)

    if (leadsError) {
      console.error("[webhooks/clerk] Failed to query leads for removed agent:", leadsError.message)
      return
    }

    const leadIds = (leads ?? []).map((l) => l.id)

    if (leadIds.length > 0) {
      // 2. Unassign leads — set agent_id to NULL (moves to unassigned pool)
      const { error: updateError } = await supabase
        .from("leads")
        .update({ agent_id: null, updated_at: new Date().toISOString() })
        .in("id", leadIds)

      if (updateError) {
        console.error("[webhooks/clerk] Failed to unassign leads:", updateError.message)
      }

      // 3. Create activity log entries for each unassigned lead
      await logLeadUnassignment(supabase, leads ?? [], orgId, agentName, removedUserId)
    }

    // 4. Unassign phone numbers where the removed agent was the assignee
    const { error: phoneError } = await supabase
      .from("agent_phone_numbers")
      .update({ assignee_agent_id: null, updated_at: new Date().toISOString() })
      .eq("assignee_agent_id", removedUserId)

    if (phoneError) {
      console.error("[webhooks/clerk] Failed to unassign phone numbers:", phoneError.message)
    }

    console.info(
      `[webhooks/clerk] Agent ${agentName} removed from org ${orgId}: ${leadIds.length} leads unassigned, phone assignments cleared`,
    )
  } catch (err) {
    console.error("[webhooks/clerk] Membership deletion handling failed:", err instanceof Error ? err.message : String(err))
  }
}

async function logLeadUnassignment(
  supabase: DbClient,
  leads: Array<{ id: string; first_name: string | null; last_name: string | null }>,
  orgId: string,
  agentName: string,
  agentId: string,
): Promise<void> {
  const inserts = leads.map((lead) => {
    const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown Lead"
    return {
      lead_id: lead.id,
      agent_id: agentId,
      org_id: orgId,
      activity_type: "lead_reassigned",
      title: `Lead moved to unassigned pool — agent ${agentName} removed from team`,
      details: { leadName, removedAgent: agentName, reason: "agent_removed_from_org" } as unknown as Json,
    }
  })

  const { error } = await supabase.from("activity_logs").insert(inserts)

  if (error) {
    console.error("[webhooks/clerk] Failed to log lead unassignment activities:", error.message)
  }
}
