"use client"

import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { LifeEventCard as LifeEventCardType } from "@/lib/types/coaching"

interface LifeEventCardProps {
  card: LifeEventCardType
  collapsed: boolean
  onToggle: () => void
  onDismiss: () => void
}

export function LifeEventCardComponent({
  card,
  collapsed,
  onToggle,
  onDismiss,
}: LifeEventCardProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg border border-l-4 border-l-green-500 bg-white px-3 py-2 text-left text-[11px] text-[#475569] transition-colors hover:bg-[#f9fafb]"
      >
        <span>{card.emoji}</span>
        <span className="truncate font-medium">
          {card.event} &mdash; cross-sell opportunity
        </span>
      </button>
    )
  }

  return (
    <Card className="border-l-4 border-l-green-500 gap-0 rounded-lg border-y border-r py-0 shadow-none">
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
            <span>LIFE EVENT: {card.event}</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#94a3b8] transition-colors hover:text-[#475569]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {card.crossSellSuggestions.length > 0 && (
          <div className="mt-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#94a3b8]">
              Cross-sell opportunity:
            </p>
            <ul className="mt-1 space-y-0.5">
              {card.crossSellSuggestions.map((suggestion, i) => (
                <li key={i} className="text-[11px] leading-snug text-[#334155]">
                  &middot; {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {card.suggestedScript && (
          <div className="mt-2">
            <p className="text-[10px] font-medium text-green-600">
              TRY SAYING:
            </p>
            <p className="mt-0.5 text-[11px] italic leading-snug text-[#475569]">
              &ldquo;{card.suggestedScript}&rdquo;
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
