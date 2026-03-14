import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
import { getSmsLogs, getSmsLogsByOrg } from "@/lib/supabase/sms"
import { sendSms } from "@/lib/sms/send"
import { createServiceRoleClient } from "@/lib/supabase/server"

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const requestSchema = z.object({
  to: z.string().min(10, "Phone number required"),
  message: z.string().min(1, "Message required").max(1600, "Message too long"),
  leadId: z.string().uuid("Invalid lead ID"),
})

/* ------------------------------------------------------------------ */
/*  POST /api/sms                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  const { to, message, leadId } = parsed.data

  try {
    const { userId, orgId, orgRole, has } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    if (has && !has({ feature: "sms_messaging" })) {
      return Response.json(
        { error: "This feature requires a Pro plan. Upgrade at /pricing." },
        { status: 403 },
      )
    }

    // In team mode, admin replies should come from the lead's agent's number.
    // Look up the lead's agent_id and use it for from-number resolution + log attribution.
    let effectiveAgentId = userId
    if (orgId && orgRole === "org:admin") {
      const serviceClient = createServiceRoleClient()
      const { data: lead } = await serviceClient
        .from("leads")
        .select("agent_id")
        .eq("id", leadId)
        .eq("org_id", orgId)
        .single()

      if (lead?.agent_id && lead.agent_id !== userId) {
        effectiveAgentId = lead.agent_id
      }
    }

    const result = await sendSms({
      to,
      message,
      leadId,
      agentId: effectiveAgentId,
      orgId: orgId ?? null,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to send SMS" },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error("[sms] POST error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  GET /api/sms?leadId=...                                            */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const url = new URL(request.url)
  const leadId = url.searchParams.get("leadId")
  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 })
  }

  // Validate UUID format (matches POST handler's z.string().uuid())
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(leadId)) {
    return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 })
  }

  try {
    const { userId, orgId, orgRole } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const scope = url.searchParams.get("scope") ?? "personal"

    // Team mode: admin sees all org SMS logs for this lead
    const logs = (scope === "team" && orgId && orgRole === "org:admin")
      ? await getSmsLogsByOrg(leadId, orgId)
      : await getSmsLogs(leadId, userId)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[sms] GET error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load SMS logs" },
      { status: 500 },
    )
  }
}
