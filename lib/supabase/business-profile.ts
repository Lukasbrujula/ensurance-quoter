import { createAuthClient } from "./auth-server"
import type { FAQEntry } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BusinessProfile {
  businessName: string
  knowledgeBase: string
  faq: FAQEntry[]
}

const EMPTY_PROFILE: BusinessProfile = {
  businessName: "",
  knowledgeBase: "",
  faq: [],
}

/* ------------------------------------------------------------------ */
/*  Read                                                               */
/* ------------------------------------------------------------------ */

export async function getBusinessProfile(
  userId: string,
): Promise<BusinessProfile> {
  const supabase = await createAuthClient()

  // Table not yet in generated types — will resolve after migration + type regen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("agent_business_profile")
    .select("business_name, knowledge_base, faq")
    .eq("agent_id", userId)
    .single()

  if (error || !data) return { ...EMPTY_PROFILE }

  const row = data as { business_name: string | null; knowledge_base: string | null; faq: unknown }
  const faq: FAQEntry[] = Array.isArray(row.faq) ? (row.faq as FAQEntry[]) : []

  return {
    businessName: row.business_name ?? "",
    knowledgeBase: row.knowledge_base ?? "",
    faq,
  }
}

/* ------------------------------------------------------------------ */
/*  Upsert                                                             */
/* ------------------------------------------------------------------ */

export async function upsertBusinessProfile(
  userId: string,
  profile: BusinessProfile,
): Promise<void> {
  const supabase = await createAuthClient()

  // Table not yet in generated types — will resolve after migration + type regen
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("agent_business_profile")
    .upsert(
      {
        agent_id: userId,
        business_name: profile.businessName || null,
        knowledge_base: profile.knowledgeBase || null,
        faq: profile.faq,
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

/**
 * Combine FAQ entries + free-form KB text into a single string
 * suitable for injection into the agent system prompt.
 * Returns null if both are empty.
 */
export function buildGlobalKnowledgeBase(
  profile: BusinessProfile,
): string | null {
  const parts: string[] = []

  if (profile.businessName) {
    parts.push(`Business Name: ${profile.businessName}`)
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
