/* ------------------------------------------------------------------ */
/*  SLA Configuration + Summary Types                                  */
/* ------------------------------------------------------------------ */

export interface SlaConfig {
  /** Minutes before a 'new' lead is flagged urgent */
  urgent_minutes: number
  /** Hours with no activity before a lead is considered stale */
  stale_hours: number
  /** Hours before an org lead auto-reassigns to unassigned pool */
  auto_reassign_hours: number
  /** Whether to surface SLA breaches in admin notifications */
  notify_admin: boolean
}

export const DEFAULT_SLA_CONFIG: SlaConfig = {
  urgent_minutes: 30,
  stale_hours: 24,
  auto_reassign_hours: 48,
  notify_admin: true,
}

export interface SlaSummary {
  urgentUnassigned: number
  staleLeads: number
  missedFollowUps: number
  autoReassignedToday: number
}
