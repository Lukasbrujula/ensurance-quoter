"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Headphones } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CoachingCard } from "@/lib/types/coaching"
import { StyleCardComponent } from "./style-card"
import { MedicationCardComponent } from "./medication-card"
import { LifeEventCardComponent } from "./life-event-card"
import { CoachingTipCardComponent } from "./coaching-tip-card"

/* ------------------------------------------------------------------ */
/*  Auto-collapse timeouts per card type (ms)                          */
/* ------------------------------------------------------------------ */

const COLLAPSE_TIMEOUTS: Record<CoachingCard["type"], number | null> = {
  style: null,
  medication: 60_000,
  life_event: 60_000,
  coaching_tip: 30_000,
}

const MAX_EXPANDED = 5

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CoachingCardStackProps {
  cards: CoachingCard[]
  onDismiss: (cardId: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CoachingCardStack({ cards, onDismiss }: CoachingCardStackProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const toggleCollapsed = useCallback((cardId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [])

  // Set up auto-collapse timers for new cards
  useEffect(() => {
    const currentIds = new Set(cards.map((c) => c.id))

    // Clear timers for removed cards
    for (const [id, timer] of timersRef.current) {
      if (!currentIds.has(id)) {
        clearTimeout(timer)
        timersRef.current.delete(id)
      }
    }

    // Set timers for new cards
    for (const card of cards) {
      if (timersRef.current.has(card.id)) continue

      const timeout = COLLAPSE_TIMEOUTS[card.type]
      if (timeout === null) continue

      const timer = setTimeout(() => {
        setCollapsed((prev) => {
          const next = new Set(prev)
          next.add(card.id)
          return next
        })
        timersRef.current.delete(card.id)
      }, timeout)

      timersRef.current.set(card.id, timer)
    }
  }, [cards])

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  // Auto-collapse cards beyond MAX_EXPANDED
  useEffect(() => {
    const expandedNonStyle = cards.filter(
      (c) => c.type !== "style" && !collapsed.has(c.id),
    )
    if (expandedNonStyle.length <= MAX_EXPANDED) return

    // Collapse oldest expanded cards beyond the limit
    const toCollapse = expandedNonStyle.slice(0, expandedNonStyle.length - MAX_EXPANDED)
    if (toCollapse.length === 0) return

    setCollapsed((prev) => {
      const next = new Set(prev)
      for (const card of toCollapse) {
        next.add(card.id)
      }
      return next
    })
  }, [cards, collapsed])

  if (cards.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9]">
          <Headphones className="h-5 w-5 text-[#94a3b8]" />
        </div>
        <p className="mt-4 text-[13px] font-medium text-[#475569]">
          Listening...
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#94a3b8]">
          Intelligence cards will appear as the conversation progresses.
        </p>
      </div>
    )
  }

  // Style card pinned at top, others reverse-chronological
  const styleCard = cards.find((c) => c.type === "style")
  const otherCards = cards
    .filter((c) => c.type !== "style")
    .sort((a, b) => b.timestamp - a.timestamp)

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-2 px-3 py-3">
        {styleCard && (
          <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
            <StyleCardComponent card={styleCard} />
          </div>
        )}

        {otherCards.map((card) => {
          const isCollapsed = collapsed.has(card.id)

          return (
            <div
              key={card.id}
              className="animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              {card.type === "medication" && (
                <MedicationCardComponent
                  card={card}
                  collapsed={isCollapsed}
                  onToggle={() => toggleCollapsed(card.id)}
                  onDismiss={() => onDismiss(card.id)}
                />
              )}
              {card.type === "life_event" && (
                <LifeEventCardComponent
                  card={card}
                  collapsed={isCollapsed}
                  onToggle={() => toggleCollapsed(card.id)}
                  onDismiss={() => onDismiss(card.id)}
                />
              )}
              {card.type === "coaching_tip" && (
                <CoachingTipCardComponent
                  card={card}
                  collapsed={isCollapsed}
                  onToggle={() => toggleCollapsed(card.id)}
                  onDismiss={() => onDismiss(card.id)}
                />
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
