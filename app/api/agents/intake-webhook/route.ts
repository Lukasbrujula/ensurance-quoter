import { z } from "zod"
import { NextResponse } from "next/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { verifyTelnyxWebhook } from "@/lib/middleware/telnyx-webhook-verify"
import { createServiceRoleClient, type DbClient } from "@/lib/supabase/server"
import { findLeadByPhone } from "@/lib/supabase/leads"
import { insertActivityLog } from "@/lib/supabase/activities"

/* ------------------------------------------------------------------ */
/*  Payload schema — fields the AI agent collects during intake calls  */
/* ------------------------------------------------------------------ */

const intakePayloadSchema = z.object({
  caller_name: z.string().min(1).max(200),
  callback_number: z.string().max(30).regex(/^[+\d\s()\-]*$/).optional(),
  reason: z.string().min(1).max(1000),
  callback_time: z.string().max(200).optional(),
  age_range: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  urgency: z.enum(["low", "medium", "high"]).optional().default("low"),
  notes: z.string().max(2000).optional(),
})

/* ------------------------------------------------------------------ */
/*  POST /api/agents/intake-webhook                                    */
/*  Called BY Telnyx AI save_caller_info tool (not by users).          */
/*  agent_id + ai_agent_id passed as query parameters.                 */
/*  Returns 200 quickly — Telnyx tool calls have timeout limits.       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const rl = await checkRateLimit(rateLimiters.webhook, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    // Read raw body BEFORE parsing — required for signature verification
    const rawBody = await request.text()

    // Verify Telnyx webhook signature (ED25519)
    const sigVerification = verifyTelnyxWebhook(
      rawBody,
      request.headers.get("telnyx-signature-ed25519"),
      request.headers.get("telnyx-timestamp"),
    )
    if (!sigVerification.valid) {
      console.warn("[intake-webhook] Signature rejected:", sigVerification.reason)
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 },
      )
    }

    // Extract IDs from query parameters
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agent_id")
    const aiAgentId = searchParams.get("ai_agent_id")

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing agent_id parameter" },
        { status: 400 },
      )
    }

    // Validate agent_id is a UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(agentId)) {
      return NextResponse.json(
        { error: "Invalid agent_id format" },
        { status: 400 },
      )
    }

    // Parse and validate the verified webhook payload
    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      )
    }

    const parsed = intakePayloadSchema.safeParse(body)
    if (!parsed.success) {
      console.error("[intake-webhook] Validation error:", parsed.error.flatten())
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      )
    }

    const data = parsed.data
    const supabase = createServiceRoleClient()

    // Look up AI agent to determine org context
    let orgId: string | null = null
    if (aiAgentId) {
      const { data: aiAgent } = await supabase
        .from("ai_agents")
        .select("org_id")
        .eq("id", aiAgentId)
        .maybeSingle()
      orgId = aiAgent?.org_id ?? null
    }

    // Duplicate check: does a lead with this phone already exist?
    // Team context (orgId): search across entire org
    // Solo context: search by agent_id only
    if (data.callback_number) {
      const existingLead = orgId
        ? await findLeadByPhoneInOrg(supabase, orgId, data.callback_number)
        : await findLeadByPhone(agentId, data.callback_number, supabase)

      if (existingLead) {
        // Lead exists — append call note but don't create duplicate
        const appendNote = [
          `AI intake call on ${new Date().toISOString()}`,
          `Reason: ${data.reason}`,
          data.callback_time ? `Callback: ${data.callback_time}` : null,
          data.urgency === "high" ? "URGENT" : null,
          data.notes ? `Notes: ${data.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n")

        const existingNotes =
          (existingLead as { notes?: string | null }).notes || ""
        const updatedNotes = existingNotes
          ? `${existingNotes}\n\n---\n${appendNote}`
          : appendNote

        await supabase
          .from("leads")
          .update({
            notes: updatedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLead.id)

        return NextResponse.json({
          success: true,
          action: "updated",
          leadId: existingLead.id,
        })
      }
    }

    // No duplicate — create new lead
    // Team context: unassigned pool (agent_id = null, org_id set)
    // Solo context: assign to the agent
    const { firstName, lastName } = parseName(data.caller_name)

    const leadNotes = [
      `AI Agent Intake — ${new Date().toISOString()}`,
      `Reason: ${data.reason}`,
      data.callback_time ? `Callback preference: ${data.callback_time}` : null,
      data.urgency === "high"
        ? "URGENT — caller indicated time-sensitive need"
        : null,
      data.age_range ? `Age range: ${data.age_range}` : null,
      data.notes ? `Additional notes: ${data.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        agent_id: orgId ? null : agentId,
        org_id: orgId ?? null,
        first_name: firstName,
        last_name: lastName,
        phone: data.callback_number ?? null,
        state: data.state ?? null,
        source: "ai_agent",
        status: "new",
        notes: leadNotes,
      })
      .select("id")
      .single()

    if (leadError || !newLead) {
      console.error("[intake-webhook] Failed to create lead:", leadError?.message)
      return NextResponse.json(
        { error: "Failed to create lead" },
        { status: 500 },
      )
    }

    // Fire-and-forget: log activity for notification bell
    // Use admin's agentId for tracking — lead itself is unassigned
    insertActivityLog(
      {
        leadId: newLead.id,
        agentId,
        activityType: "lead_created",
        title: "Lead created by AI voice agent",
        details: {
          source: "ai_agent",
          ai_agent_id: aiAgentId ?? null,
          reason: data.reason,
          org_id: orgId,
        },
      },
      supabase,
    ).catch((error) => {
      console.error(
        "[intake-webhook] Failed to log activity:",
        error instanceof Error ? error.message : String(error),
      )
    })

    return NextResponse.json({
      success: true,
      action: "created",
      leadId: newLead.id,
    })
  } catch (error) {
    console.error(
      "[intake-webhook] Unexpected error:",
      error instanceof Error ? error.message : String(error),
    )
    // Return 200 to prevent Telnyx retry storms
    return NextResponse.json({ received: true })
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function parseName(fullName: string): {
  firstName: string
  lastName: string | null
} {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0]!, lastName: null }
  }
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  }
}

/** Find a lead by phone across all agents in an org (team dedup). */
async function findLeadByPhoneInOrg(
  supabase: DbClient,
  orgId: string,
  phoneNumber: string,
): Promise<{ id: string; notes?: string | null } | null> {
  const digits = phoneNumber.replace(/\D/g, "")
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits

  const { data: rows } = await supabase
    .from("leads")
    .select("id, phone, notes")
    .eq("org_id", orgId)
    .not("phone", "is", null)

  if (!rows) return null

  const match = rows.find((row) => {
    if (!row.phone) return false
    const rowDigits = row.phone.replace(/\D/g, "")
    const rowLast10 = rowDigits.length >= 10 ? rowDigits.slice(-10) : rowDigits
    return rowLast10 === last10
  })

  return match ? { id: match.id, notes: match.notes } : null
}
