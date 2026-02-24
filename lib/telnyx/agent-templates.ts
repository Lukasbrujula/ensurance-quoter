/* ------------------------------------------------------------------ */
/*  AI Agent Templates — Pre-Built Personas                            */
/*  Code-defined templates for common insurance agent use cases.       */
/*  Each template pre-fills name, description, greeting, voice,        */
/*  personality, collect fields, and post-call actions.                 */
/*                                                                     */
/*  The prompt compiler (prompt-compiler.ts) converts these structured  */
/*  fields into a Telnyx voice prompt. Templates NO LONGER include     */
/*  a promptBuilder function — the compiler handles all compilation.    */
/* ------------------------------------------------------------------ */

import type { CollectFieldId, PostCallActionId, BusinessHours } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AgentTemplate {
  id: string
  name: string
  description: string
  icon: "Phone" | "CalendarPlus" | "HelpCircle"
  greeting: string
  personality: string
  collectFields: CollectFieldId[]
  postCallActions: PostCallActionId[]
  voice: string
  suggestedName: string
  /** Tone preset ID that maps to a TonePreset in tone-presets.ts */
  defaultTonePreset: string
  /** Default business hours — null means disabled */
  defaultBusinessHours: BusinessHours | null
  /** Whether this template supports an after-hours mode toggle */
  supportsAfterHours?: boolean
  /** Alternate greeting used when after-hours mode is enabled */
  afterHoursGreeting?: string
}

/* ------------------------------------------------------------------ */
/*  Default business hours (Mon-Fri 9-5 ET)                            */
/* ------------------------------------------------------------------ */

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  timezone: "America/New_York",
  schedule: {
    monday: { open: "09:00", close: "17:00" },
    tuesday: { open: "09:00", close: "17:00" },
    wednesday: { open: "09:00", close: "17:00" },
    thursday: { open: "09:00", close: "17:00" },
    friday: { open: "09:00", close: "17:00" },
    saturday: null,
    sunday: null,
  },
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
    personality:
      "You are a friendly, professional receptionist for an insurance agency. Warm but efficient. You answer calls on behalf of the agent.",
    collectFields: ["name", "phone", "reason", "callback_time"],
    postCallActions: ["save_lead", "book_calendar", "send_notification"],
    voice: "Telnyx.NaturalHD.astra",
    suggestedName: "Intake Agent",
    defaultTonePreset: "warm",
    defaultBusinessHours: null,
    supportsAfterHours: true,
    afterHoursGreeting:
      "Hi, you've reached {agent}'s office. We're currently closed, but I can take your information so {agent} can call you back during business hours. How can I help?",
  },
  {
    id: "appointment-scheduler",
    name: "Appointment Scheduler",
    description:
      "Focused on booking appointments. Collects name, preferred date/time, and reason for meeting. Confirms the booking.",
    icon: "CalendarPlus",
    greeting:
      "Hi there! I can help you schedule a time to speak with {agent}. What's your name?",
    personality:
      "You are a scheduling assistant. Be efficient and friendly. People calling to schedule want a quick process. Confirm details clearly.",
    collectFields: ["name", "phone", "reason", "callback_time", "email"],
    postCallActions: ["save_lead", "book_calendar", "send_notification"],
    voice: "Telnyx.NaturalHD.astra",
    suggestedName: "Scheduling Agent",
    defaultTonePreset: "professional",
    defaultBusinessHours: null,
    supportsAfterHours: true,
    afterHoursGreeting:
      "Hi, thanks for calling! We're currently closed, but I can schedule an appointment for you with {agent} during business hours. What's your name?",
  },
  {
    id: "faq-handler",
    name: "FAQ Handler",
    description:
      "Answers common questions about your services, then offers to connect the caller with you for specific needs.",
    icon: "HelpCircle",
    greeting:
      "Hi, thanks for calling {business}! I can help answer questions about our services or connect you with {agent}. How can I help?",
    personality:
      "You are a helpful assistant who answers general questions about the agency's services. When you cannot answer a question, offer to have the agent call back.",
    collectFields: ["name", "phone", "reason"],
    postCallActions: ["save_lead", "send_notification"],
    voice: "Telnyx.NaturalHD.astra",
    suggestedName: "FAQ Agent",
    defaultTonePreset: "professional",
    defaultBusinessHours: null,
    supportsAfterHours: true,
    afterHoursGreeting:
      "Hi, thanks for calling {business}! We're currently closed, but I can take your question and have {agent} follow up during business hours. How can I help?",
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

/**
 * Resolve a raw greeting string (with {agent}/{business} placeholders).
 */
export function resolveGreetingString(
  greeting: string,
  agentName: string,
  businessName?: string,
): string {
  const business = businessName || `${agentName}'s office`
  return greeting
    .replace(/\{agent\}/g, agentName)
    .replace(/\{business\}/g, business)
}
