/* ------------------------------------------------------------------ */
/*  Activity Log Types                                                 */
/* ------------------------------------------------------------------ */

export type ActivityType =
  | "lead_created"
  | "status_change"
  | "call"
  | "quote"
  | "enrichment"
  | "follow_up"
  | "note"
  | "lead_updated"
  | "email_sent"
  | "sms_sent"
  | "sms_received"
  | "lead_reassigned"
  | "lead_transferred"

export interface ActivityLog {
  id: string
  leadId: string
  agentId: string
  activityType: ActivityType
  title: string
  details: Record<string, unknown> | null
  createdAt: string
}

/* ------------------------------------------------------------------ */
/*  Detail payloads (for type-safe construction)                       */
/* ------------------------------------------------------------------ */

export interface StatusChangeDetails {
  from: string
  to: string
}

export interface CallDetails {
  direction: "inbound" | "outbound"
  duration_seconds: number | null
  has_transcript: boolean
}

export interface QuoteDetails {
  carrier_count: number
  top_carrier: string | null
  coverage: string | null
  term: string | null
}

export interface EnrichmentDetails {
  fields_updated: string[]
}

export interface FollowUpDetails {
  date: string
  note: string | null
}

export interface NoteDetails {
  text: string
}

export interface LeadUpdatedDetails {
  fields_changed: string[]
}

export interface LeadCreatedDetails {
  source: string
}

export interface EmailSentDetails {
  recipient: string
  subject: string
  type: "quote_summary"
}

export interface SmsDetails {
  direction: "outbound" | "inbound"
  to: string
  message_preview: string
}
