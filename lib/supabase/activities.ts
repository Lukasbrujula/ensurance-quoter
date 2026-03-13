/* ------------------------------------------------------------------ */
/*  Activity Log Data Access                                           */
/* ------------------------------------------------------------------ */

import { createClerkSupabaseClient } from "./clerk-client"
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
  agentId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<{ activities: ActivityLog[]; total: number }> {
  const supabase = await createClerkSupabaseClient()

  // Filter by agent_id for ownership — defense-in-depth alongside RLS
  const { count } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)

  const { data: rows, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`Failed to load activity logs: ${error.message}`)

  return {
    activities: (rows ?? []).map(rowToActivity),
    total: count ?? 0,
  }
}

/* ------------------------------------------------------------------ */
/*  Global history query (agent-scoped, no lead filter)                */
/* ------------------------------------------------------------------ */

export type HistoryCategory = "all" | "calls" | "quotes" | "messages" | "notes" | "system"

const CATEGORY_TYPES: Record<Exclude<HistoryCategory, "all">, ActivityType[]> = {
  calls: ["call"],
  quotes: ["quote"],
  messages: ["sms_sent", "sms_received", "email_sent"],
  notes: ["note"],
  system: ["enrichment", "lead_created", "lead_updated", "status_change", "follow_up"],
}

export interface HistoryEntry {
  id: string
  leadId: string
  leadName: string
  activityType: ActivityType
  title: string
  details: Record<string, unknown> | null
  createdAt: string
}

export async function getGlobalActivityLogs(
  agentId: string,
  category: HistoryCategory = "all",
  limit: number = 30,
  offset: number = 0,
  dateFrom?: string,
  dateTo?: string,
): Promise<{ entries: HistoryEntry[]; total: number }> {
  const supabase = await createClerkSupabaseClient()

  // Count query
  let countQuery = supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)

  // Data query with lead join for name
  let dataQuery = supabase
    .from("activity_logs")
    .select("*, leads!activity_logs_lead_id_fkey(first_name, last_name)")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  // Category filter
  if (category !== "all") {
    const types = CATEGORY_TYPES[category]
    countQuery = countQuery.in("activity_type", types)
    dataQuery = dataQuery.in("activity_type", types)
  }

  // Date filters
  if (dateFrom) {
    countQuery = countQuery.gte("created_at", dateFrom)
    dataQuery = dataQuery.gte("created_at", dateFrom)
  }
  if (dateTo) {
    countQuery = countQuery.lte("created_at", dateTo)
    dataQuery = dataQuery.lte("created_at", dateTo)
  }

  const [{ count }, { data: rows, error }] = await Promise.all([countQuery, dataQuery])

  if (error) throw new Error(`Failed to load history: ${error.message}`)

  const entries: HistoryEntry[] = (rows ?? []).map((row) => {
    const lead = (row as Record<string, unknown>).leads as { first_name: string | null; last_name: string | null } | null
    const firstName = lead?.first_name ?? ""
    const lastName = lead?.last_name ?? ""
    const leadName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown Lead"

    return {
      id: row.id,
      leadId: row.lead_id,
      leadName,
      activityType: row.activity_type as ActivityType,
      title: row.title,
      details: row.details as Record<string, unknown> | null,
      createdAt: row.created_at!,
    }
  })

  return { entries, total: count ?? 0 }
}

/** Returns counts per category for the tab badges */
export async function getActivityCategoryCounts(
  agentId: string,
): Promise<Record<HistoryCategory, number>> {
  const supabase = await createClerkSupabaseClient()

  const { data: rows, error } = await supabase
    .from("activity_logs")
    .select("activity_type")
    .eq("agent_id", agentId)

  if (error) throw new Error(`Failed to load category counts: ${error.message}`)

  const counts: Record<HistoryCategory, number> = {
    all: 0,
    calls: 0,
    quotes: 0,
    messages: 0,
    notes: 0,
    system: 0,
  }

  for (const row of rows ?? []) {
    counts.all++
    const type = row.activity_type as ActivityType
    for (const [cat, types] of Object.entries(CATEGORY_TYPES)) {
      if (types.includes(type)) {
        counts[cat as Exclude<HistoryCategory, "all">]++
        break
      }
    }
  }

  return counts
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
  const supabase = client ?? await createClerkSupabaseClient()

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
