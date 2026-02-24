import { createServiceRoleClient } from "@/lib/supabase/server"

/**
 * Data retention policy:
 *
 * | Data Type           | Retention | After Expiry                     |
 * |---------------------|-----------|----------------------------------|
 * | Full transcripts    | 90 days   | NULL — keep AI summary           |
 * | Coaching hints      | 90 days   | NULL                             |
 * | AI summaries        | 1 year    | NULL                             |
 * | Enrichment data     | 1 year    | Delete row                       |
 * | Call log metadata   | 2 years   | Keep (duration, direction, date) |
 * | Lead notes          | No limit  | Agent-managed                    |
 * | Lead PII            | No limit  | Agent-managed                    |
 */

export interface RetentionReport {
  transcriptsCleared: number
  coachingCleared: number
  summariesCleared: number
  enrichmentsDeleted: number
  errors: string[]
}

export async function runRetentionCleanup(): Promise<RetentionReport> {
  // Service role: no user session in cron context
  const supabase = createServiceRoleClient()
  const report: RetentionReport = {
    transcriptsCleared: 0,
    coachingCleared: 0,
    summariesCleared: 0,
    enrichmentsDeleted: 0,
    errors: [],
  }

  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Clear transcripts older than 90 days
  try {
    const { data, error } = await supabase
      .from("call_logs")
      .update({ transcript_text: null })
      .not("transcript_text", "is", null)
      .lt("started_at", ninetyDaysAgo)
      .select("id")

    if (error) {
      report.errors.push(`Transcript cleanup: ${error.message}`)
    } else {
      report.transcriptsCleared = data?.length ?? 0
    }
  } catch (err) {
    report.errors.push(`Transcript cleanup failed: ${err instanceof Error ? err.message : "unknown"}`)
  }

  // 2. Clear coaching hints older than 90 days
  try {
    const { data, error } = await supabase
      .from("call_logs")
      .update({ coaching_hints: null })
      .not("coaching_hints", "is", null)
      .lt("started_at", ninetyDaysAgo)
      .select("id")

    if (error) {
      report.errors.push(`Coaching cleanup: ${error.message}`)
    } else {
      report.coachingCleared = data?.length ?? 0
    }
  } catch (err) {
    report.errors.push(`Coaching cleanup failed: ${err instanceof Error ? err.message : "unknown"}`)
  }

  // 3. Clear AI summaries older than 1 year
  try {
    const { data, error } = await supabase
      .from("call_logs")
      .update({ ai_summary: null })
      .not("ai_summary", "is", null)
      .lt("started_at", oneYearAgo)
      .select("id")

    if (error) {
      report.errors.push(`Summary cleanup: ${error.message}`)
    } else {
      report.summariesCleared = data?.length ?? 0
    }
  } catch (err) {
    report.errors.push(`Summary cleanup failed: ${err instanceof Error ? err.message : "unknown"}`)
  }

  // 4. Delete enrichments older than 1 year
  try {
    const { data, error } = await supabase
      .from("enrichments")
      .delete()
      .lt("enriched_at", oneYearAgo)
      .select("id")

    if (error) {
      report.errors.push(`Enrichment cleanup: ${error.message}`)
    } else {
      report.enrichmentsDeleted = data?.length ?? 0
    }
  } catch (err) {
    report.errors.push(`Enrichment cleanup failed: ${err instanceof Error ? err.message : "unknown"}`)
  }

  return report
}
