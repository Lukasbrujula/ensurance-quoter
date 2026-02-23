"use client"

import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { CoachingTipCard as CoachingTipCardType } from "@/lib/types/coaching"

interface CoachingTipCardProps {
  card: CoachingTipCardType
  collapsed: boolean
  onToggle: () => void
  onDismiss: () => void
}

export function CoachingTipCardComponent({
  card,
  collapsed,
  onToggle,
  onDismiss,
}: CoachingTipCardProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg border border-l-4 border-l-gray-400 bg-white px-3 py-2 text-left text-[11px] text-[#475569] transition-colors hover:bg-[#f9fafb]"
      >
        <span>💡</span>
        <span className="truncate font-medium">{card.title}</span>
      </button>
    )
  }

  return (
    <Card className="border-l-4 border-l-gray-400 gap-0 rounded-lg border-y border-r py-0 shadow-none">
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
            <span>{card.title}</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#94a3b8] transition-colors hover:text-[#475569]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <p className="mt-1.5 text-[11px] leading-snug text-[#334155]">
          {card.content}
        </p>

        {card.script && (
          <p className="mt-1.5 text-[11px] italic leading-snug text-[#475569]">
            &ldquo;{card.script}&rdquo;
          </p>
        )}
      </div>
    </Card>
  )
}
