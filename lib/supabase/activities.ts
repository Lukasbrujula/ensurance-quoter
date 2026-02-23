/* ------------------------------------------------------------------ */
/*  Activity Log Data Access                                           */
/* ------------------------------------------------------------------ */

import { createAuthClient } from "./auth-server"
import type { DbClient } from "./server"
import type { ActivityLog, ActivityType } from "@/lib/types/activity"
import type { Tables, TablesInsert, Json } from "@/lib/types/database.generated"

type ActivityLogDbRow = Tables<"activity_logs">
type ActivityLogDbInsert = TablesInsert<"activity_logs">

/* ------------------------------------------------------------------ */
/*  Row <-> ActivityLog mapping                                        */
/* ------------------------------------------------------------------ */

function rowToActivity(row: ActivityLogDbRow): ActivityLog {
  return {
    id: row.id,
    leadId: row.lead_id,
    agentId: row.agent_id,
    activityType: row.activity_type as ActivityType,
    title: row.title,
    details: row.details as Record<string, unknown> | null,
    createdAt: row.created_at!,
  }
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export async function getActivityLogs(
  leadId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ activities: ActivityLog[]; total: number }> {
  const supabase = await createAuthClient()

  const { count } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)

  const { data: rows, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`Failed to load activity logs: ${error.message}`)

  return {
    activities: (rows ?? []).map(rowToActivity),
    total: count ?? 0,
  }
}

/* ------------------------------------------------------------------ */
/*  Insert                                                             */
/* ------------------------------------------------------------------ */

export interface InsertActivityInput {
  leadId: string
  agentId: string
  activityType: ActivityType
  title: string
  details?: Record<string, unknown> | null
}

export async function insertActivityLog(
  input: InsertActivityInput,
  client?: DbClient,
): Promise<ActivityLog> {
  const supabase = client ?? await createAuthClient()

  const insert: ActivityLogDbInsert = {
    lead_id: input.leadId,
    agent_id: input.agentId,
    activity_type: input.activityType,
    title: input.title,
    details: (input.details ?? null) as Json,
  }

  const { data: row, error } = await supabase
    .from("activity_logs")
    .insert(insert)
    .select()
    .single()

  if (error) throw new Error(`Failed to insert activity log: ${error.message}`)

  return rowToActivity(row)
}
