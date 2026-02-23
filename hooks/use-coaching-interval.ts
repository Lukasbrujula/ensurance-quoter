"use client"

import { useEffect, useRef } from "react"
import { useCallStore } from "@/lib/store/call-store"
import { useLeadStore } from "@/lib/store/lead-store"
import type { CoachingCard } from "@/lib/types/coaching"

/* ------------------------------------------------------------------ */
/*  useCoachingInterval                                                 */
/*  30s interval that sends client speech to /api/coaching and adds     */
/*  returned coaching cards to the call store. Fire-and-forget.         */
/* ------------------------------------------------------------------ */

const INTERVAL_MS = 30_000
const COOLDOWN_MS = 15_000
const MAX_CARDS_PER_CALL = 15
const MAX_WORDS = 500
const MIN_CHARS = 50

const CALL_ACTIVE_STATES = new Set(["active", "held"])

function extractClientSpeech(
  transcript: ReadonlyArray<{ speaker: string; text: string; isFinal: boolean }>,
  maxWords: number,
): string {
  const clientFinals = transcript.filter(
    (e) => e.speaker === "client" && e.isFinal,
  )

  // Collect words from most recent entries in reverse, then reverse once
  const collected: string[] = []
  for (let i = clientFinals.length - 1; i >= 0 && collected.length < maxWords; i--) {
    const entryWords = clientFinals[i].text.split(/\s+/).filter(Boolean)
    collected.push(...entryWords)
  }

  return collected.reverse().slice(0, maxWords).join(" ")
}

/** Serialize existing coaching cards into summary strings for the API
 *  so it knows what's already been surfaced and avoids repeating. */
function buildPreviousCardSummaries(cards: CoachingCard[]): string[] {
  return cards.map((c) => {
    switch (c.type) {
      case "style":
        return `style:${c.quadrant}-${c.label}`
      case "medication":
        return `medication:${c.medicationName}`
      case "life_event":
        return `life_event:${c.event}`
      case "coaching_tip":
        return `tip:${c.title}`
    }
  })
}

export function useCoachingInterval(): void {
  const lastCardTimeRef = useRef(0)
  const cardCountRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFetchingRef = useRef(false)

  useEffect(() => {
    cardCountRef.current = 0
    lastCardTimeRef.current = 0

    function tick() {
      const { callState, transcript, coachingCards, addCoachingCard } =
        useCallStore.getState()
      const { intakeData } = useLeadStore.getState()

      // Guard: only run during active calls
      if (!CALL_ACTIVE_STATES.has(callState)) return

      // Guard: need lead profile for context
      if (!intakeData) return

      // Guard: max cards per call
      if (cardCountRef.current >= MAX_CARDS_PER_CALL) return

      // Guard: cooldown since last card
      if (Date.now() - lastCardTimeRef.current < COOLDOWN_MS) return

      // Guard: need transcript content (min 50 chars)
      const chunk = extractClientSpeech(transcript, MAX_WORDS)
      if (chunk.length < MIN_CHARS) return

      // Guard: prevent concurrent fetches
      if (isFetchingRef.current) return
      isFetchingRef.current = true

      const existingHintTexts = buildPreviousCardSummaries(coachingCards)

      // Fire-and-forget — errors logged but don't break the call
      fetch("/api/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptChunk: chunk,
          leadProfile: intakeData,
          existingHintTexts,
        }),
      })
        .then((res) => {
          if (!res.ok) return null
          return res.json() as Promise<{ cards: CoachingCard[] }>
        })
        .then((data) => {
          if (!data?.cards?.length) return

          for (const card of data.cards) {
            addCoachingCard(card)
            cardCountRef.current += 1
            lastCardTimeRef.current = Date.now()
          }
        })
        .catch(() => {
          // Silently fail — coaching is non-critical
        })
        .finally(() => {
          isFetchingRef.current = false
        })
    }

    // Check call state to decide whether to start/stop the interval
    function checkAndStart() {
      const { callState } = useCallStore.getState()

      if (CALL_ACTIVE_STATES.has(callState)) {
        if (!intervalRef.current) {
          intervalRef.current = setInterval(tick, INTERVAL_MS)
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        // Reset counters when call is no longer active (between calls)
        cardCountRef.current = 0
        lastCardTimeRef.current = 0
      }
    }

    // Subscribe to state changes — start/stop interval on callState transitions
    let prevCallState = useCallStore.getState().callState
    const unsubscribe = useCallStore.subscribe((state) => {
      if (state.callState !== prevCallState) {
        prevCallState = state.callState
        checkAndStart()
      }
    })

    // Initial check
    checkAndStart()

    return () => {
      unsubscribe()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])
}
