"use client"

import { ShieldCheck } from "lucide-react"
import type { LeadPreScreen } from "@/lib/engine/pre-screen"

interface PreScreenBadgeProps {
  preScreen: LeadPreScreen | null
  compact?: boolean
}

export function PreScreenBadge({ preScreen, compact }: PreScreenBadgeProps) {
  if (!preScreen) return null

  const { eligible, totalCarriers } = preScreen
  const pct = totalCarriers > 0 ? eligible / totalCarriers : 0

  const colorClass =
    pct > 0.7
      ? "bg-green-50 text-green-700 border-green-200"
      : pct >= 0.3
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200"

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}
      >
        <ShieldCheck className="h-2.5 w-2.5" />
        {eligible}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colorClass}`}
    >
      <ShieldCheck className="h-3 w-3" />
      {eligible} eligible
    </span>
  )
}
