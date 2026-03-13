/* ------------------------------------------------------------------ */
/*  Urgency keyword detection for inbox auto-classification            */
/*  Keyword-only — no LLM calls. Fast and free.                        */
/* ------------------------------------------------------------------ */

/**
 * Insurance-specific urgency trigger phrases.
 * All lowercase — input is lowercased before matching.
 */
export const URGENCY_KEYWORDS: readonly string[] = [
  // Policy lifecycle
  "cancel",
  "cancellation",
  "lapse",
  "expire",
  "expiring",
  "deadline",
  "overdue",

  // Claims & incidents
  "claim",
  "accident",
  "death",
  "died",
  "hospital",
  "emergency",
  "injury",
  "injured",

  // Coverage gaps
  "not covered",
  "no coverage",
  "denied",
  "declined",
  "rejected",

  // Frustration / escalation
  "urgent",
  "asap",
  "immediately",
  "right away",
  "call me now",
  "need help",
  "frustrated",
  "angry",
  "unacceptable",
  "complaint",
  "lawyer",
  "attorney",
  "legal",

  // Financial
  "payment failed",
  "premium due",
  "past due",
  "collections",
] as const

/**
 * Pipeline statuses that indicate time-sensitive stages.
 * Leads in these statuses get auto-flagged as urgent on inbound messages.
 */
export const URGENT_PIPELINE_STATUSES = new Set([
  "applied",
  "issued",
])

/**
 * Check if a message contains urgency triggers (keyword match only).
 * Returns true if any keyword is found in the text.
 */
export function checkMessageUrgency(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return URGENCY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

/**
 * Full urgency evaluation: message keywords + lead context.
 * Checks message content, pipeline status, and overdue follow-ups.
 */
export function evaluateUrgency(
  messageText: string,
  leadStatus: string | null,
  followUpDate: string | null,
): boolean {
  // Keyword match
  if (checkMessageUrgency(messageText)) return true

  // Time-sensitive pipeline stage
  if (leadStatus && URGENT_PIPELINE_STATUSES.has(leadStatus)) return true

  // Overdue follow-up
  if (followUpDate && new Date(followUpDate) < new Date()) return true

  return false
}
