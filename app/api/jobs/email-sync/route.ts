import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { runEmailSync } from "@/lib/jobs/email-sync"

/**
 * POST /api/jobs/email-sync
 *
 * Background Gmail sync cron job. Syncs new emails for all connected agents.
 * Auth: CRON_SECRET header only (no user session — called by scheduler).
 * Schedule: every 10 minutes (vercel.json)
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
    const report = await runEmailSync()
    return NextResponse.json(report)
  } catch {
    return NextResponse.json(
      { error: "Email sync job failed" },
      { status: 500 },
    )
  }
}
