/* ------------------------------------------------------------------ */
/*  GET /api/dashboard/calendar — Merged Ensurance + Google events     */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { requireUser } from "@/lib/supabase/auth-server"
import { createAuthClient } from "@/lib/supabase/auth-server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import {
  getUpcomingEvents,
  isCalendarConnected,
} from "@/lib/google/calendar-service"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CalendarEvent {
  id: string
  type: "follow_up" | "ai_callback" | "external"
  title: string
  startTime: string
  endTime?: string
  leadId?: string
  leadName?: string
  source: "ensurance" | "google" | "both"
  googleEventId?: string
  note?: string
}

/* ------------------------------------------------------------------ */
/*  Handler                                                            */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const user = await requireUser()
    const url = new URL(request.url)

    const startParam = url.searchParams.get("start")
    const endParam = url.searchParams.get("end")

    const now = new Date()
    const startDate = startParam ? new Date(startParam) : getWeekStart(now)
    const endDate = endParam ? new Date(endParam) : getWeekEnd(now)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date parameters" },
        { status: 400 },
      )
    }

    // Limit range to 30 days to prevent abuse
    const maxRangeMs = 30 * 24 * 60 * 60 * 1000
    if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
      return NextResponse.json(
        { error: "Date range too large (max 30 days)" },
        { status: 400 },
      )
    }

    const supabase = await createAuthClient()

    // Fetch Ensurance follow-ups in range
    const { data: followUpRows } = await supabase
      .from("leads")
      .select("id, first_name, last_name, follow_up_date, follow_up_note, source, google_event_id")
      .eq("agent_id", user.id)
      .not("follow_up_date", "is", null)
      .gte("follow_up_date", startDate.toISOString())
      .lte("follow_up_date", endDate.toISOString())
      .order("follow_up_date", { ascending: true })
      .limit(50)

    // Check if Google Calendar is connected
    const googleConnected = await isCalendarConnected(user.id)

    // Fetch Google Calendar events (non-blocking)
    let googleEvents: Array<{
      id: string
      summary: string
      description?: string | null
      startTime: string
      endTime: string
      leadId?: string | null
    }> = []

    if (googleConnected) {
      googleEvents = await getUpcomingEvents(user.id, startDate, endDate)
    }

    // Merge events
    const merged = mergeEvents(followUpRows ?? [], googleEvents)

    return NextResponse.json({
      events: merged,
      googleConnected,
    })
  } catch (error) {
    console.error("GET /api/dashboard/calendar error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load calendar events" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Merge logic                                                        */
/* ------------------------------------------------------------------ */

function mergeEvents(
  followUps: Array<{
    id: string
    first_name: string | null
    last_name: string | null
    follow_up_date: string | null
    follow_up_note: string | null
    source: string
    google_event_id: string | null
  }>,
  googleEvents: Array<{
    id: string
    summary: string
    description?: string | null
    startTime: string
    endTime: string
    leadId?: string | null
  }>,
): CalendarEvent[] {
  const merged: CalendarEvent[] = []
  const matchedGoogleIds = new Set<string>()

  // Map Ensurance follow-ups
  for (const fu of followUps) {
    if (!fu.follow_up_date) continue

    const leadName =
      [fu.first_name, fu.last_name].filter(Boolean).join(" ") || "Unknown"
    const isAI = fu.source === "ai_agent"

    merged.push({
      id: fu.id,
      type: isAI ? "ai_callback" : "follow_up",
      title: `${isAI ? "AI Callback" : "Follow-up"}: ${leadName}`,
      startTime: fu.follow_up_date,
      leadId: fu.id,
      leadName,
      source: fu.google_event_id ? "both" : "ensurance",
      googleEventId: fu.google_event_id ?? undefined,
      note: fu.follow_up_note ?? undefined,
    })

    if (fu.google_event_id) {
      matchedGoogleIds.add(fu.google_event_id)
    }
  }

  // Add unmatched Google events as external
  for (const ge of googleEvents) {
    if (matchedGoogleIds.has(ge.id)) continue

    // Skip Ensurance-created events that should have been matched
    if (ge.leadId) continue

    merged.push({
      id: `google-${ge.id}`,
      type: "external",
      title: ge.summary || "Untitled event",
      startTime: ge.startTime,
      endTime: ge.endTime,
      source: "google",
      googleEventId: ge.id,
      note: ge.description ?? undefined,
    })
  }

  return merged.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
}
