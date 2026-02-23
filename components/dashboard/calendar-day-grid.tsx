"use client"

import { useMemo } from "react"
import { isSameDay, format, isToday as checkIsToday } from "date-fns"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CalendarEventBlock } from "./calendar-event-block"
import { CalendarEventPopover } from "./calendar-event-popover"
import type { CalendarEvent } from "./calendar-event-item"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const START_HOUR = 7
const END_HOUR = 20
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
)

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM"
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return "12 PM"
  return `${hour - 12} PM`
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CalendarDayGridProps {
  date: Date
  events: CalendarEvent[]
  onSlotClick: (date: Date, hour: number) => void
  onEventDeleted: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarDayGrid({
  date,
  events,
  onSlotClick,
  onEventDeleted,
}: CalendarDayGridProps) {
  const todayDate = checkIsToday(date)

  /** Group events by hour */
  const eventsByHour = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const event of events) {
      const start = new Date(event.startTime)
      if (!isSameDay(start, date)) continue
      const hour = start.getHours()
      const existing = map.get(hour) ?? []
      map.set(hour, [...existing, event])
    }
    return map
  }, [events, date])

  const dayLabel = todayDate
    ? `Today \u2014 ${format(date, "EEEE, MMMM d")}`
    : format(date, "EEEE, MMMM d")

  return (
    <div className="flex flex-col">
      {/* Day header */}
      <div className="border-b px-3 py-2 sticky top-0 z-10 bg-background">
        <h3
          className={cn(
            "text-xs font-bold tracking-wide",
            todayDate ? "text-[#1773cf]" : "text-muted-foreground",
          )}
        >
          {dayLabel.toUpperCase()}
        </h3>
      </div>

      {/* Time grid */}
      <ScrollArea className="max-h-[380px]">
        <div className="flex flex-col">
          {HOURS.map((hour) => {
            const hourEvents = eventsByHour.get(hour) ?? []
            const now = new Date()
            const isCurrentHour =
              todayDate && now.getHours() === hour

            return (
              <div
                key={hour}
                className={cn(
                  "flex min-h-12 border-b group",
                  isCurrentHour && "bg-blue-50/40",
                )}
              >
                {/* Time label */}
                <div className="w-14 shrink-0 flex items-start justify-end pr-2 pt-1 border-r">
                  <span
                    className={cn(
                      "text-[10px] tabular-nums leading-none",
                      isCurrentHour
                        ? "text-[#1773cf] font-semibold"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatHour(hour)}
                  </span>
                </div>

                {/* Event area */}
                <div className="flex-1 relative px-1 py-0.5">
                  {hourEvents.length > 0 ? (
                    <div className="space-y-0.5">
                      {hourEvents.map((event) => (
                        <CalendarEventPopover
                          key={event.id}
                          event={event}
                          onEventDeleted={onEventDeleted}
                        >
                          <div>
                            <CalendarEventBlock event={event} />
                          </div>
                        </CalendarEventPopover>
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSlotClick(date, hour)}
                      className="absolute inset-0 flex items-center px-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                      title={`Add event at ${formatHour(hour)}`}
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/40 mr-1" />
                      <span className="text-[10px] text-muted-foreground/40">
                        Add event
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
