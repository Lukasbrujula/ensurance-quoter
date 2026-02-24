import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { runRetentionCleanup } from "@/lib/jobs/data-retention"

/**
 * POST /api/jobs/retention
 *
 * Data retention cleanup cron job. Designed to run daily.
 * Auth: CRON_SECRET header only (no user session — called by scheduler).
 *
 * Vercel Cron or external scheduler should call:
 *   curl -X POST https://app.example.com/api/jobs/retention \
 *     -H "x-cron-secret: $CRON_SECRET"
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

  // Timing-safe comparison to prevent timing attacks
  const expected = Buffer.from(cronSecret, "utf8")
  const actual = Buffer.from(provided, "utf8")

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const report = await runRetentionCleanup()
    return NextResponse.json(report)
  } catch {
    return NextResponse.json(
      { error: "Retention cleanup failed" },
      { status: 500 },
    )
  }
}
