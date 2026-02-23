"use client"

import { useRouter } from "next/navigation"
import { Bot } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CalendarEvent {
  id: string
  type: "follow_up" | "ai_callback" | "external"
  title: string
  startTime: string
  endTime?: string
  leadId?: string
  leadName?: string
  source: "ensurance" | "google" | "both"
  googleEventId?: string
  note?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarEventItem({ event }: { event: CalendarEvent }) {
  const router = useRouter()

  const dotColor: Record<string, string> = {
    follow_up: "bg-green-500",
    ai_callback: "bg-violet-500",
    external: "bg-muted-foreground/40",
  }

  const isClickable = event.type !== "external" && !!event.leadId

  const time = new Date(event.startTime)
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <button
      type="button"
      onClick={() => {
        if (isClickable && event.leadId) {
          router.push(`/leads/${event.leadId}`)
        }
      }}
      disabled={!isClickable}
      className={cn(
        "w-full flex items-start gap-3 rounded-md px-2 py-2 text-left transition-colors",
        isClickable
          ? "hover:bg-muted/50 cursor-pointer"
          : "cursor-default opacity-75",
      )}
    >
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full mt-1.5 shrink-0",
          dotColor[event.type] ?? "bg-muted-foreground/40",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {timeStr}
          </span>
          <span className="text-[13px] font-medium truncate">{event.title}</span>
          {event.type === "ai_callback" && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 bg-violet-100 text-violet-700"
            >
              <Bot className="mr-0.5 h-2.5 w-2.5" />
              AI
            </Badge>
          )}
          {event.source === "both" && (
            <Badge
              variant="secondary"
              className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700"
            >
              Synced
            </Badge>
          )}
        </div>
        {event.note && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {event.note}
          </p>
        )}
        {event.type === "external" && (
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            from Google Calendar
          </p>
        )}
      </div>
    </button>
  )
}
