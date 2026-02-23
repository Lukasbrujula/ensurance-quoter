"use client"

import { AlertTriangle, AlertCircle, Info, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type InsightSeverity = "critical" | "warning" | "info" | "tip"

export interface LiveInsight {
  id: string
  type: "medication" | "condition" | "carrier_alert" | "coaching" | "info"
  severity: InsightSeverity
  title: string
  details: string[]
  timestamp: number
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  { icon: typeof AlertTriangle; border: string; bg: string; iconColor: string; titleColor: string }
> = {
  critical: {
    icon: AlertTriangle,
    border: "border-l-red-500",
    bg: "bg-red-50",
    iconColor: "text-red-500",
    titleColor: "text-red-700",
  },
  warning: {
    icon: AlertCircle,
    border: "border-l-amber-400",
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
    titleColor: "text-amber-700",
  },
  info: {
    icon: Info,
    border: "border-l-blue-400",
    bg: "bg-blue-50",
    iconColor: "text-blue-500",
    titleColor: "text-blue-700",
  },
  tip: {
    icon: Lightbulb,
    border: "border-l-emerald-400",
    bg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-700",
  },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function InsightCard({ insight }: { insight: LiveInsight }) {
  const config = SEVERITY_CONFIG[insight.severity]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "rounded-md border-l-[3px] px-3 py-2.5",
        config.border,
        config.bg,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", config.iconColor)} />
        <span className={cn("text-[12px] font-semibold", config.titleColor)}>
          {insight.title}
        </span>
      </div>
      {insight.details.length > 0 && (
        <ul className="ml-[22px] mt-1 space-y-0.5">
          {insight.details.slice(0, 4).map((detail, i) => (
            <li key={i} className="text-[11px] text-[#475569]">
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
