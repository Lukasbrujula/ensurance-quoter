"use client"

import { X } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { MedicationCard as MedicationCardType, MedicationCarrierResult } from "@/lib/types/coaching"

interface MedicationCardProps {
  card: MedicationCardType
  collapsed: boolean
  onToggle: () => void
  onDismiss: () => void
}

const RESULT_ORDER: Record<MedicationCarrierResult["result"], number> = {
  accept: 0,
  conditional: 1,
  unknown: 2,
  decline: 3,
}

const RESULT_EMOJI: Record<MedicationCarrierResult["result"], string> = {
  accept: "\u2705",
  conditional: "\u26A0\uFE0F",
  unknown: "\u2753",
  decline: "\u274C",
}

function sortedResults(results: MedicationCarrierResult[]): MedicationCarrierResult[] {
  return [...results].sort((a, b) => RESULT_ORDER[a.result] - RESULT_ORDER[b.result])
}

export function MedicationCardComponent({
  card,
  collapsed,
  onToggle,
  onDismiss,
}: MedicationCardProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-lg border border-l-4 border-l-amber-500 bg-white px-3 py-2 text-left text-[11px] text-[#475569] transition-colors hover:bg-[#f9fafb]"
      >
        <span>💊</span>
        <span className="truncate font-medium">
          {card.medicationName} &rarr; {card.condition}
        </span>
      </button>
    )
  }

  const bgTint = card.severity === "high" ? "bg-amber-50/50" : "bg-white"

  return (
    <Card className={`border-l-4 border-l-amber-500 gap-0 rounded-lg border-y border-r py-0 shadow-none ${bgTint}`}>
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
            <span>MEDICATION DETECTED</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[#94a3b8] transition-colors hover:text-[#475569]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-1.5">
          <span className="text-[13px] font-semibold text-[#0f172a]">
            &ldquo;{card.medicationName}&rdquo;
          </span>
          <span className="ml-1.5 text-[11px] text-[#475569]">
            &middot; {card.condition}
          </span>
        </div>

        <div className="mt-2 space-y-0.5">
          {sortedResults(card.carrierResults).map((cr) => (
            <div key={cr.carrierId} className="flex items-center gap-1.5 text-[11px]">
              <span className="w-4 shrink-0 text-center">
                {RESULT_EMOJI[cr.result]}
              </span>
              <span className="font-medium text-[#334155]">
                {cr.carrier}
              </span>
              {cr.detail && (
                <span className="text-[#94a3b8]">: {cr.detail}</span>
              )}
            </div>
          ))}
        </div>

        {card.agentNote && (
          <p className="mt-2 text-[10px] leading-snug text-amber-700">
            {card.agentNote}
          </p>
        )}
      </div>
    </Card>
  )
}
