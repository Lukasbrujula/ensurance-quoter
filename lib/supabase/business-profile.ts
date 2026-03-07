import { createClerkSupabaseClient } from "./clerk-client"
import type { FAQEntry } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DaySchedule {
  open: boolean
  from: string
  to: string
}

export type WeekSchedule = Record<
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  DaySchedule
>

export interface BusinessProfile {
  businessName: string
  knowledgeBase: string
  faq: FAQEntry[]
  businessHours?: WeekSchedule
}

const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { open: true, from: "09:00", to: "17:00" },
  tuesday: { open: true, from: "09:00", to: "17:00" },
  wednesday: { open: true, from: "09:00", to: "17:00" },
  thursday: { open: true, from: "09:00", to: "17:00" },
  friday: { open: true, from: "09:00", to: "17:00" },
  saturday: { open: false, from: "09:00", to: "17:00" },
  sunday: { open: false, from: "09:00", to: "17:00" },
}

const EMPTY_PROFILE: BusinessProfile = {
  businessName: "",
  knowledgeBase: "",
  faq: [],
  businessHours: DEFAULT_SCHEDULE,
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

export async function getBusinessProfile(
  userId: string,
): Promise<BusinessProfile> {
  const supabase = await createClerkSupabaseClient()

  // Table not yet in generated types — will resolve after migration + type regen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("agent_business_profile")
    .select("business_name, knowledge_base, faq, business_hours")
    .eq("agent_id", userId)
    .single()

  if (error || !data) return { ...EMPTY_PROFILE }

  const row = data as {
    business_name: string | null
    knowledge_base: string | null
    faq: unknown
    business_hours: unknown
  }
  const faq: FAQEntry[] = Array.isArray(row.faq) ? (row.faq as FAQEntry[]) : []

  const businessHours =
    row.business_hours && typeof row.business_hours === "object"
      ? (row.business_hours as WeekSchedule)
      : DEFAULT_SCHEDULE

  return {
    businessName: row.business_name ?? "",
    knowledgeBase: row.knowledge_base ?? "",
    faq,
    businessHours,
  }
}

/* ------------------------------------------------------------------ */
/*  Upsert                                                             */
/* ------------------------------------------------------------------ */

export async function upsertBusinessProfile(
  userId: string,
  profile: BusinessProfile,
): Promise<void> {
  const supabase = await createClerkSupabaseClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("agent_business_profile")
    .upsert(
      {
        agent_id: userId,
        business_name: profile.businessName || null,
        knowledge_base: profile.knowledgeBase || null,
        faq: profile.faq,
        business_hours: profile.businessHours ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id" },
    )

  if (error) {
    console.error(
      "upsertBusinessProfile error:",
      error instanceof Error ? error.message : String(error),
    )
    throw new Error("Failed to save business profile")
  }
}

/* ------------------------------------------------------------------ */
/*  Build combined global knowledge base string for prompt injection   */
/* ------------------------------------------------------------------ */

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

const DAYS_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(":")
  const h = parseInt(hStr, 10)
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  const ampm = h >= 12 ? "PM" : "AM"
  return `${hour12}:${mStr} ${ampm}`
}

/**
 * Format business hours into a natural language string for voice agents.
 * Returns null if no hours are configured or all days are closed.
 */
export function formatBusinessHoursForPrompt(
  hours: WeekSchedule | undefined,
): string | null {
  if (!hours) return null

  const lines: string[] = []
  for (const day of DAYS_ORDER) {
    const s = hours[day]
    if (s.open) {
      lines.push(
        `${DAY_LABELS[day]}: ${formatTime12(s.from)} to ${formatTime12(s.to)}`,
      )
    } else {
      lines.push(`${DAY_LABELS[day]}: Closed`)
    }
  }

  const hasAnyOpen = DAYS_ORDER.some((d) => hours[d].open)
  if (!hasAnyOpen) return null

  return lines.join(". ")
}

/**
 * Combine business name, FAQ entries, free-form KB text, and business hours
 * into a single string suitable for injection into the agent system prompt.
 * Returns null if all fields are empty.
 */
export function buildGlobalKnowledgeBase(
  profile: BusinessProfile,
): string | null {
  const parts: string[] = []

  if (profile.businessName) {
    parts.push(`Business Name: ${profile.businessName}`)
  }

  const hoursText = formatBusinessHoursForPrompt(profile.businessHours)
  if (hoursText) {
    parts.push(`Business Hours: ${hoursText}`)
  }

  if (profile.faq.length > 0) {
    const pairs = profile.faq
      .map((e) => `Question: ${e.question}\nAnswer: ${e.answer}`)
      .join("\n\n")
    parts.push(pairs)
  }

  if (profile.knowledgeBase) {
    parts.push(profile.knowledgeBase)
  }

  return parts.length > 0 ? parts.join("\n\n") : null
}
