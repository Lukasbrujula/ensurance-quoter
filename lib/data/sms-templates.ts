/* ------------------------------------------------------------------ */
/*  SMS Quick Templates                                                */
/* ------------------------------------------------------------------ */

export interface SmsTemplate {
  id: string
  label: string
  icon: string
  template: string
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: "follow_up",
    label: "Follow-up",
    icon: "clock",
    template:
      "Hi {firstName}, this is {agent} following up on our conversation about life insurance. Do you have a few minutes to chat? I'd love to answer any questions you might have.",
  },
  {
    id: "quote_ready",
    label: "Quote Ready",
    icon: "calculator",
    template:
      "Hi {firstName}, great news! I've found some excellent term life options for you — {coverage} coverage starting as low as competitive rates. When's a good time to review the options together?",
  },
  {
    id: "appointment_reminder",
    label: "Appointment Reminder",
    icon: "calendar",
    template:
      "Hi {firstName}, just a friendly reminder about our appointment scheduled for {time}. Looking forward to speaking with you! If you need to reschedule, just let me know.",
  },
  {
    id: "docs_needed",
    label: "Docs Needed",
    icon: "file",
    template:
      "Hi {firstName}, we're almost there! To finalize your application with {carrierName}, I just need a few documents from you. Can you send those over when you get a chance?",
  },
]

/**
 * Resolve template variables with lead/agent context.
 * Missing values are replaced with sensible fallbacks.
 */
export function resolveTemplate(
  template: string,
  variables: {
    firstName?: string | null
    agent?: string | null
    coverage?: string | null
    time?: string | null
    carrierName?: string | null
  },
): string {
  return template
    .replace(/\{firstName\}/g, variables.firstName || "there")
    .replace(/\{agent\}/g, variables.agent || "your agent")
    .replace(/\{coverage\}/g, variables.coverage || "your selected")
    .replace(/\{time\}/g, variables.time || "our scheduled time")
    .replace(/\{carrierName\}/g, variables.carrierName || "the carrier")
}
