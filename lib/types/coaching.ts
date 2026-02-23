/* ------------------------------------------------------------------ */
/*  Coaching Card Types — T11.1b                                       */
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
