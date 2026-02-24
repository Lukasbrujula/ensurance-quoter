import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { runFollowUpReminders } from "@/lib/jobs/follow-up-reminders"

/**
 * POST /api/jobs/follow-up-reminders
 *
 * Follow-up reminder cron job. Sends digest emails to agents.
 * Auth: CRON_SECRET header only (no user session — called by scheduler).
 * Schedule: weekdays at 7am, 11am, 3pm UTC (vercel.json)
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    )
  }

  const provided = request.headers.get("x-cron-secret") ?? ""

  const expected = Buffer.from(cronSecret, "utf8")
  const actual = Buffer.from(provided, "utf8")

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const report = await runFollowUpReminders()
    return NextResponse.json(report)
  } catch {
    return NextResponse.json(
      { error: "Follow-up reminder job failed" },
      { status: 500 },
    )
  }
}
