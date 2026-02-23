"use client"

import { Card } from "@/components/ui/card"
import type { StyleCard as StyleCardType } from "@/lib/types/coaching"

interface StyleCardProps {
  card: StyleCardType
}

function ConfidenceDots({ confidence }: { confidence: 1 | 2 | 3 | 4 }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            i < confidence ? "bg-blue-500" : "bg-blue-200"
          }`}
        />
      ))}
    </span>
  )
}

export function StyleCardComponent({ card }: StyleCardProps) {
  return (
    <Card className="border-l-4 border-l-blue-500 gap-0 rounded-lg border-y border-r py-0 shadow-none">
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
          <span>COMMUNICATION STYLE</span>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#0f172a]">
            {card.label} ({card.quadrant})
          </span>
          <ConfidenceDots confidence={card.confidence} />
        </div>

        <p className="mt-0.5 text-[11px] text-[#475569]">
          {card.description}
        </p>

        {card.tips.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {card.tips.map((tip, i) => (
              <li
                key={i}
                className="text-[11px] leading-snug text-[#334155]"
              >
                <span className="text-blue-500">&rarr;</span> {tip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
