/* ------------------------------------------------------------------ */
/*  Fire-and-forget activity logging                                   */
/*  Called from server actions to log activity events.                  */
/*  Non-blocking — failures are logged but never propagated.           */
/* ------------------------------------------------------------------ */

import { insertActivityLog } from "@/lib/supabase/activities"
import type { ActivityType } from "@/lib/types/activity"

export function logActivity(input: {
  leadId: string
  agentId: string
  activityType: ActivityType
  title: string
  details?: Record<string, unknown> | null
}): void {
  // Fire-and-forget — do not await
  void insertActivityLog(input).catch((error) => {
    console.error("[logActivity] Failed to log activity:", error)
  })
}
