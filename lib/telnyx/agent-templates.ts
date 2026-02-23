/* ------------------------------------------------------------------ */
/*  AI Agent Templates — Pre-Built Personas                            */
/*  Code-defined templates for common insurance agent use cases.       */
/*  Each template pre-fills name, description, greeting, voice,        */
/*  and system prompt when creating a new agent.                       */
/* ------------------------------------------------------------------ */

import {
  buildInsuranceIntakePrompt,
  buildAfterHoursPrompt,
  buildSchedulerPrompt,
  buildFAQPrompt,
} from "./ai-prompts"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AgentTemplate {
  id: string
  name: string
  description: string
  icon: "Phone" | "Moon" | "CalendarPlus" | "HelpCircle"
  greeting: string
  promptBuilder: (agentName: string, agencyName?: string) => string
  voice: string
  suggestedName: string
}

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
  {
    id: "insurance-intake",
    name: "Insurance Intake",
    description:
      "Answers calls when you are unavailable. Collects caller name, reason for calling, and callback preference. Does NOT discuss rates or medical details.",
    icon: "Phone",
    greeting:
      "Hi, you've reached {agent}'s office. They're not available right now, but I can take some information so they can call you back. How can I help?",
    promptBuilder: buildInsuranceIntakePrompt,
    voice: "Telnyx.NaturalHD.astra",
    suggestedName: "Insurance Intake Agent",
  },
  {
    id: "after-hours",
    name: "After Hours",
    description:
      "Handles calls outside business hours. Lets callers know your hours, collects a message, and schedules a next-day callback.",
    icon: "Moon",
    greeting:
      "Thank you for calling! Our office hours are Monday through Friday, 9 AM to 5 PM. I can take a message and have {agent} call you back first thing. What's your name?",
    promptBuilder: buildAfterHoursPrompt,
    voice: "Telnyx.NaturalHD.astra",
    suggestedName: "After Hours Agent",
  },
  {
    id: "appointment-scheduler",
    name: "Appointment Scheduler",
    description:
      "Focused on booking appointments. Collects name, preferred date/time, and reason for meeting. Confirms the booking.",
    icon: "CalendarPlus",
    greeting:
      "Hi there! I can help you schedule a time to speak with {agent}. What's your name?",
    promptBuilder: buildSchedulerPrompt,
    voice: "Telnyx.NaturalHD.astra",
    suggestedName: "Scheduling Agent",
  },
  {
    id: "faq-handler",
    name: "FAQ Handler",
    description:
      "Answers common questions about your services, then offers to connect the caller with you for specific needs.",
    icon: "HelpCircle",
    greeting:
      "Hi, thanks for calling {business}! I can help answer questions about our services or connect you with {agent}. How can I help?",
    promptBuilder: buildFAQPrompt,
    voice: "Telnyx.NaturalHD.astra",
    suggestedName: "FAQ Agent",
  },
] as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((t) => t.id === id)
}

/**
 * Resolve greeting placeholders with actual agent/business names.
 */
export function resolveGreeting(
  template: AgentTemplate,
  agentName: string,
  businessName?: string,
): string {
  const business = businessName || `${agentName}'s office`
  return template.greeting
    .replace(/\{agent\}/g, agentName)
    .replace(/\{business\}/g, business)
}
