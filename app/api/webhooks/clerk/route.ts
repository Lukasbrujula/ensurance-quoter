import { NextResponse } from "next/server"
import { Webhook } from "svix"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { createBillingGroup } from "@/lib/telnyx/billing"

/* ------------------------------------------------------------------ */
/*  POST /api/webhooks/clerk — Clerk webhook receiver                  */
/*  Auth: Svix signature verification (Standard Webhooks spec).        */
/*  Handles `user.created` → creates Telnyx billing group for agent.   */
/* ------------------------------------------------------------------ */

interface ClerkUserPayload {
  id: string
  first_name: string | null
  last_name: string | null
  email_addresses: Array<{
    email_address: string
  }>
}

interface ClerkWebhookEvent {
  type: string
  data: ClerkUserPayload
}

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

  // Only handle user.created — acknowledge all other events
  if (event.type !== "user.created") {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const { id: userId, first_name, last_name, email_addresses } = event.data
  const displayName = [first_name, last_name].filter(Boolean).join(" ") || email_addresses?.[0]?.email_address || userId

  try {
    // Create Telnyx billing group for this agent
    const billingGroup = await createBillingGroup(`Ensurance - ${displayName}`)

    // Store billing group ID in agent_settings using service role (no user session in webhooks)
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

  // Always return 200 after signature verification passes
  return NextResponse.json({ received: true }, { status: 200 })
}
