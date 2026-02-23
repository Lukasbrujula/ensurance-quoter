"use client"

import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CalendarEvent } from "./calendar-event-item"

/* ------------------------------------------------------------------ */
/*  Color config                                                       */
/* ------------------------------------------------------------------ */

const EVENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  follow_up: {
    border: "border-l-green-500",
    bg: "bg-green-50 hover:bg-green-100",
    text: "text-green-900",
  },
  ai_callback: {
    border: "border-l-violet-500",
    bg: "bg-violet-50 hover:bg-violet-100",
    text: "text-violet-900",
  },
  external: {
    border: "border-l-gray-400",
    bg: "bg-gray-50 hover:bg-gray-100",
    text: "text-gray-700",
  },
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CalendarEventBlockProps {
  event: CalendarEvent
  /** Compact mode for week grid cells */
  compact?: boolean
  onClick?: (event: CalendarEvent) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarEventBlock({
  event,
  compact = false,
  onClick,
}: CalendarEventBlockProps) {
  const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS.external

  const time = new Date(event.startTime)
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={cn(
        "w-full text-left rounded-sm border-l-2 transition-colors cursor-pointer",
        colors.border,
        colors.bg,
        compact ? "px-1 py-0.5" : "px-2 py-1",
      )}
    >
      <div className={cn("flex items-center gap-1 min-w-0", compact && "flex-col items-start gap-0")}>
        {!compact && (
          <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
            {timeStr}
          </span>
        )}
        <span className={cn("truncate font-medium", colors.text, compact ? "text-[9px] leading-tight" : "text-[11px]")}>
          {compact ? event.title.replace(/^(Follow-up|AI Callback): /, "") : event.title}
        </span>
        {event.type === "ai_callback" && !compact && (
          <Bot className="h-2.5 w-2.5 shrink-0 text-violet-500" />
        )}
      </div>
      {event.note && !compact && (
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {event.note}
        </p>
      )}
    </button>
  )
}
