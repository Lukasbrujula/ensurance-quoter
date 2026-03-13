/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/widgets — Aggregated data for dashboard widgets */
/*  Batches multiple widget queries into a single endpoint.            */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"
import { getUnreadCounts } from "@/lib/supabase/sms"
import { getEmailUnreadCounts } from "@/lib/supabase/email"

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClerkSupabaseClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = getStartOfWeek(now)
    const lastWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      smsUnread,
      emailUnread,
      smsCountResult,
      emailCountResult,
      callCountResult,
      aiAgentCallsResult,
      leadsWithFirstActivityResult,
      lastWeekLeadsWithFirstActivityResult,
      topCarriersResult,
    ] = await Promise.all([
      // Inbox unread counts (SMS)
      getUnreadCounts(userId),
      // Inbox unread counts (Email)
      getEmailUnreadCounts(userId),

      // SMS sent this month
      supabase
        .from("sms_logs")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", userId)
        .gte("created_at", startOfMonth.toISOString()),

      // Emails this month
      supabase
        .from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("agent_id", userId)
        .gte("created_at", startOfMonth.toISOString()),

      // Calls this month
      supabase
        .from("call_logs")
        .select("id, leads!inner(agent_id)", { count: "exact", head: true })
        .eq("leads.agent_id", userId)
        .gte("started_at", startOfMonth.toISOString()),

      // AI agent calls (for summary + queue)
      supabase
        .from("ai_agent_calls")
        .select("id, ai_agent_id, caller_name, caller_phone, reason, urgency, processed, created_at, lead_id")
        .eq("agent_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),

      // Leads for response time (this week)
      supabase
        .from("leads")
        .select("id, created_at")
        .eq("agent_id", userId)
        .gte("created_at", startOfWeek.toISOString()),

      // Leads for response time (last week - for trend)
      supabase
        .from("leads")
        .select("id, created_at")
        .eq("agent_id", userId)
        .gte("created_at", lastWeekStart.toISOString())
        .lt("created_at", startOfWeek.toISOString()),

      // Top carriers this month (quotes joined through leads)
      supabase
        .from("quotes")
        .select("response_data, leads!inner(agent_id)")
        .eq("leads.agent_id", userId)
        .gte("created_at", startOfMonth.toISOString())
        .limit(100),
    ])

    // Calculate SMS unread total
    const smsUnreadTotal = Object.values(smsUnread).reduce(
      (sum, c) => sum + c,
      0,
    )
    const emailUnreadTotal = Object.values(emailUnread).reduce(
      (sum, c) => sum + c,
      0,
    )

    // Calculate avg response time for this week
    const thisWeekLeads = leadsWithFirstActivityResult.data ?? []
    const lastWeekLeads = lastWeekLeadsWithFirstActivityResult.data ?? []

    const avgResponseTimeMinutes = await calcAvgResponseMinutes(
      supabase,
      thisWeekLeads,
    )
    const lastWeekAvgMinutes = await calcAvgResponseMinutes(
      supabase,
      lastWeekLeads,
    )

    // Communication breakdown
    const communicationBreakdown = {
      calls: callCountResult.count ?? 0,
      sms: smsCountResult.count ?? 0,
      email: emailCountResult.count ?? 0,
    }

    // AI agent calls summary
    const aiCalls = aiAgentCallsResult.data ?? []
    const thisWeekAiCalls = aiCalls.filter(
      (c) => c.created_at && new Date(c.created_at) >= startOfWeek,
    )
    const aiLeadsCreated = aiCalls.filter((c) => c.lead_id).length

    // AI call queue: recent calls
    const aiCallQueue = aiCalls
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        callerName: c.caller_name ?? "Unknown caller",
        callerNumber: c.caller_phone,
        reason: c.reason,
        status: c.processed ? "completed" : (c.urgency ?? "pending"),
        createdAt: c.created_at,
        leadId: c.lead_id,
      }))

    // Top carriers from quotes response_data
    const carrierCounts: Record<string, number> = {}
    const quotesData = topCarriersResult.data ?? []
    for (const quote of quotesData) {
      const responseData = quote.response_data as Record<string, unknown> | null
      if (!responseData) continue
      const eligible = (responseData.eligible ?? responseData.results ?? []) as Array<{
        carrierName?: string
      }>
      for (const r of eligible) {
        if (r.carrierName) {
          carrierCounts[r.carrierName] =
            (carrierCounts[r.carrierName] ?? 0) + 1
        }
      }
    }
    const topCarriers = Object.entries(carrierCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      inbox: {
        smsUnread: smsUnreadTotal,
        emailUnread: emailUnreadTotal,
        total: smsUnreadTotal + emailUnreadTotal,
      },
      avgResponseTime: {
        thisWeekMinutes: avgResponseTimeMinutes,
        lastWeekMinutes: lastWeekAvgMinutes,
      },
      communicationBreakdown,
      aiSummary: {
        totalCalls: thisWeekAiCalls.length,
        leadsCreated: aiLeadsCreated,
        pendingCallbacks: thisWeekAiCalls.filter(
          (c) => !c.processed,
        ).length,
      },
      aiCallQueue,
      topCarriers,
    })
  } catch (error) {
    console.error(
      "GET /api/dashboard/widgets error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to load widget data" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

async function calcAvgResponseMinutes(
  supabase: Awaited<ReturnType<typeof createClerkSupabaseClient>>,
  leads: Array<{ id: string; created_at: string }>,
): Promise<number | null> {
  if (leads.length === 0) return null

  const leadIds = leads.map((l) => l.id)
  const { data: activities } = await supabase
    .from("activity_logs")
    .select("lead_id, created_at, activity_type")
    .in("lead_id", leadIds)
    .in("activity_type", ["call", "sms_sent", "email_sent"])
    .order("created_at", { ascending: true })

  if (!activities || activities.length === 0) return null

  const firstByLead = new Map<string, string>()
  for (const a of activities) {
    if (!firstByLead.has(a.lead_id)) {
      firstByLead.set(a.lead_id, a.created_at!)
    }
  }

  let totalMinutes = 0
  let count = 0
  for (const lead of leads) {
    const firstContact = firstByLead.get(lead.id)
    if (firstContact) {
      const diff =
        new Date(firstContact).getTime() -
        new Date(lead.created_at).getTime()
      totalMinutes += diff / 60000
      count++
    }
  }

  return count > 0 ? Math.round(totalMinutes / count) : null
}
