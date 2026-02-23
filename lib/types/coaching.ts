import { z } from "zod"

/* ------------------------------------------------------------------ */
/*  Coaching Card Types — T11.1a / T11.1b                              */
/*  Used by the coaching card stack in Call Mode                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Style Card (DISC Communication Framework)                          */
/* ------------------------------------------------------------------ */

export interface StyleCard {
  id: string
  type: "style"
  quadrant: "D" | "I" | "S" | "C"
  label: string
  confidence: 1 | 2 | 3 | 4
  description: string
  tips: string[]
  timestamp: number
}

/* ------------------------------------------------------------------ */
/*  Medication Card (Carrier Intelligence)                             */
/* ------------------------------------------------------------------ */

export interface MedicationCarrierResult {
  carrier: string
  carrierId: string
  result: "accept" | "decline" | "conditional" | "unknown"
  detail?: string
}

export interface MedicationCard {
  id: string
  type: "medication"
  medicationName: string
  condition: string
  carrierResults: MedicationCarrierResult[]
  agentNote: string
  severity: "low" | "moderate" | "high"
  timestamp: number
}

/* ------------------------------------------------------------------ */
/*  Life Event Card (Cross-Sell Trigger)                               */
/* ------------------------------------------------------------------ */

export interface LifeEventCard {
  id: string
  type: "life_event"
  event: string
  emoji: string
  crossSellSuggestions: string[]
  suggestedScript: string
  timestamp: number
}

/* ------------------------------------------------------------------ */
/*  Coaching Tip Card (Tactical Advice)                                */
/* ------------------------------------------------------------------ */

export interface CoachingTipCard {
  id: string
  type: "coaching_tip"
  title: string
  content: string
  script?: string
  timestamp: number
}

/* ------------------------------------------------------------------ */
/*  Union Type                                                         */
/* ------------------------------------------------------------------ */

export type CoachingCard =
  | StyleCard
  | MedicationCard
  | LifeEventCard
  | CoachingTipCard

/* ------------------------------------------------------------------ */
/*  Zod Schemas — API response validation                              */
/* ------------------------------------------------------------------ */

export const StyleCardSchema = z.object({
  type: z.literal("style"),
  quadrant: z.enum(["D", "I", "S", "C"]),
  label: z.string().min(1).max(50),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  description: z.string().min(1).max(300),
  tips: z.array(z.string().min(1).max(200)).min(1).max(4),
})

export const MedicationCarrierResultSchema = z.object({
  carrier: z.string().min(1).max(60),
  carrierId: z.string().min(1).max(30),
  result: z.enum(["accept", "decline", "conditional", "unknown"]),
  detail: z.string().max(200).optional(),
})

export const MedicationCardSchema = z.object({
  type: z.literal("medication"),
  medicationName: z.string().min(1).max(100),
  condition: z.string().min(1).max(100),
  carrierResults: z.array(MedicationCarrierResultSchema).min(1).max(40),
  agentNote: z.string().min(1).max(300),
  severity: z.enum(["low", "moderate", "high"]),
})

export const LifeEventCardSchema = z.object({
  type: z.literal("life_event"),
  event: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10),
  crossSellSuggestions: z.array(z.string().min(1).max(200)).min(1).max(5),
  suggestedScript: z.string().min(1).max(500),
})

export const CoachingTipCardSchema = z.object({
  type: z.literal("coaching_tip"),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(400),
  script: z.string().max(400).optional(),
})

export const CoachingCardSchema = z.discriminatedUnion("type", [
  StyleCardSchema,
  MedicationCardSchema,
  LifeEventCardSchema,
  CoachingTipCardSchema,
])

export const CoachingResponseSchema = z.object({
  cards: z.array(CoachingCardSchema).max(3),
})
