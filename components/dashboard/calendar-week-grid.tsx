"use client"

import { useMemo } from "react"
import { addDays, isSameDay, isToday, format } from "date-fns"
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

interface CalendarWeekGridProps {
  weekStart: Date
  events: CalendarEvent[]
  onSlotClick: (date: Date, hour: number) => void
  onEventDeleted: () => void
  onDayClick: (date: Date) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarWeekGrid({
  weekStart,
  events,
  onSlotClick,
  onEventDeleted,
  onDayClick,
}: CalendarWeekGridProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  /** Map events to (dayIndex, hour) buckets */
  const eventGrid = useMemo(() => {
    const grid = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const start = new Date(event.startTime)
      const dayIdx = days.findIndex((d) => isSameDay(d, start))
      if (dayIdx === -1) continue
      const hour = start.getHours()
      const key = `${dayIdx}-${hour}`
      const existing = grid.get(key) ?? []
      grid.set(key, [...existing, event])
    }
    return grid
  }, [events, days])

  return (
    <div className="flex flex-col">
      {/* Day header row */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b sticky top-0 z-10 bg-background">
        <div className="h-8" />
        {days.map((day, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onDayClick(day)}
            className={cn(
              "flex flex-col items-center justify-center h-8 text-center border-l transition-colors hover:bg-muted/50",
              isToday(day) && "bg-blue-50",
            )}
          >
            <span className="text-[10px] font-medium text-muted-foreground">
              {format(day, "EEE")}
            </span>
            <span
              className={cn(
                "text-[11px] font-bold leading-none",
                isToday(day) ? "text-[#1773cf]" : "text-foreground",
              )}
            >
              {format(day, "d")}
            </span>
          </button>
        ))}
      </div>

      {/* Time grid */}
      <ScrollArea className="max-h-[380px]">
        <div className="grid grid-cols-[48px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="h-10 flex items-start justify-end pr-1.5 pt-0.5 border-b border-r">
                <span className="text-[9px] tabular-nums text-muted-foreground leading-none">
                  {formatHour(hour)}
                </span>
              </div>

              {/* Day cells */}
              {days.map((day, dayIdx) => {
                const key = `${dayIdx}-${hour}`
                const cellEvents = eventGrid.get(key) ?? []
                const todayCell = isToday(day)

                return (
                  <div
                    key={key}
                    className={cn(
                      "h-10 border-b border-l relative group",
                      todayCell && "bg-blue-50/30",
                    )}
                  >
                    {/* Events */}
                    <div className="absolute inset-0 p-px overflow-hidden flex flex-col gap-px">
                      {cellEvents.slice(0, 2).map((event) => (
                        <CalendarEventPopover
                          key={event.id}
                          event={event}
                          onEventDeleted={onEventDeleted}
                        >
                          <div>
                            <CalendarEventBlock
                              event={event}
                              compact
                            />
                          </div>
                        </CalendarEventPopover>
                      ))}
                      {cellEvents.length > 2 && (
                        <span className="text-[8px] text-muted-foreground pl-1">
                          +{cellEvents.length - 2} more
                        </span>
                      )}
                    </div>

                    {/* Add button on hover */}
                    {cellEvents.length === 0 && (
                      <button
                        type="button"
                        onClick={() => onSlotClick(day, hour)}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        title={`Add event at ${formatHour(hour)}`}
                      >
                        <Plus className="h-3 w-3 text-muted-foreground/50" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
