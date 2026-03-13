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

/**
 * The single unified inbound agent template.
 * All new agents use this template — no type selection needed.
 */
export const INBOUND_AGENT_TEMPLATE: AgentTemplate = {
  id: "inbound-agent",
  name: "Inbound Agent",
  description:
    "Answers calls when you are unavailable. Collects caller name, reason for calling, and callback preference. Handles scheduling and common questions.",
  icon: "Phone",
  greeting:
    "Hi, you've reached {agent}'s office. I'm a digital assistant helping with calls today. They're not available right now, but I can take some information so they can call you back. How can I help?",
  personality:
    "You are a friendly, professional receptionist for an insurance agency. Warm but efficient. You answer calls on behalf of the agent. You can also answer general questions about services and help schedule callbacks.",
  collectFields: ["name", "phone", "reason", "callback_time"],
  postCallActions: ["save_lead", "book_calendar", "send_notification"],
  voice: "Telnyx.NaturalHD.astra",
  suggestedName: "Inbound Agent",
  defaultTonePreset: "warm",
  defaultBusinessHours: null,
  supportsAfterHours: true,
  afterHoursGreeting:
    "Hi, you've reached {agent}'s office. I'm a digital assistant helping with calls today. We're currently closed, but I can take your information so {agent} can call you back during business hours. How can I help?",
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

/**
 * Single-element array kept for backward compatibility with code that
 * iterates over templates. All new agents use INBOUND_AGENT_TEMPLATE.
 */
export const AGENT_TEMPLATES: readonly AgentTemplate[] = [
  INBOUND_AGENT_TEMPLATE,
] as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Legacy template IDs that map to the unified inbound agent */
const LEGACY_TEMPLATE_IDS = new Set([
  "insurance-intake",
  "appointment-scheduler",
  "faq-handler",
  "inbound-agent",
])

export function getTemplateById(id: string): AgentTemplate | undefined {
  if (LEGACY_TEMPLATE_IDS.has(id)) return INBOUND_AGENT_TEMPLATE
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
