"use client"

import { useMemo } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from "date-fns"
import { cn } from "@/lib/utils"
import { CalendarEventPopover } from "@/components/dashboard/calendar-event-popover"
import type { CalendarEvent } from "@/components/dashboard/calendar-event-item"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const DOT_COLORS: Record<string, string> = {
  follow_up: "bg-green-500",
  ai_callback: "bg-violet-500",
  external: "bg-gray-400",
}

const EVENT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  follow_up: { bg: "bg-green-100", border: "border-green-300", text: "text-green-900" },
  ai_callback: { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-900" },
  external: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-900" },
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FullMonthViewProps {
  currentDate: Date
  events: CalendarEvent[]
  selectedDay: Date | null
  onDayClick: (date: Date) => void
  onSlotClick: (date: Date, hour: number) => void
  onEventDeleted: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FullMonthView({
  currentDate,
  events,
  selectedDay,
  onDayClick,
  onSlotClick,
  onEventDeleted,
}: FullMonthViewProps) {
  /** Build the 6-row grid of days */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days: Date[] = []
    let day = gridStart
    while (day <= gridEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentDate])

  /** Group events by date string */
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const dateKey = format(new Date(event.startTime), "yyyy-MM-dd")
      const existing = map.get(dateKey) ?? []
      map.set(dateKey, [...existing, event])
    }
    return map
  }, [events])

  /** Events for the selected day */
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    const key = format(selectedDay, "yyyy-MM-dd")
    return (eventsByDate.get(key) ?? []).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
  }, [selectedDay, eventsByDate])

  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Grid */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border shrink-0">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Week rows */}
        <div className="flex-1 grid" style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-b border-border/50">
              {week.map((day) => {
                const inMonth = isSameMonth(day, currentDate)
                const today = isToday(day)
                const selected = selectedDay ? isSameDay(day, selectedDay) : false
                const dateKey = format(day, "yyyy-MM-dd")
                const dayEvents = eventsByDate.get(dateKey) ?? []

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => onDayClick(day)}
                    className={cn(
                      "relative flex flex-col items-center p-1 border-r border-border/50 last:border-r-0 transition-colors min-h-16",
                      inMonth
                        ? "hover:bg-muted/30"
                        : "text-muted-foreground/40 hover:bg-muted/10",
                      selected && "bg-blue-50/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                        today && "bg-[#1773cf] text-white",
                        selected && !today && "bg-muted text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Event dots (max 3) */}
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              DOT_COLORS[event.type] ?? DOT_COLORS.external,
                            )}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-muted-foreground ml-0.5">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Event chips (visible on larger cells) */}
                    <div className="hidden lg:flex flex-col gap-0.5 mt-0.5 w-full px-0.5">
                      {dayEvents.slice(0, 2).map((event) => {
                        const styles = EVENT_STYLES[event.type] ?? EVENT_STYLES.external
                        const start = new Date(event.startTime)
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "rounded px-1 py-px text-[9px] font-medium truncate leading-tight",
                              styles.bg,
                              styles.text,
                            )}
                          >
                            {format(start, "h:mm")} {event.title.replace(/^(Follow-up|AI Callback): /, "")}
                          </div>
                        )
                      })}
                      {dayEvents.length > 2 && (
                        <span className="text-[8px] text-muted-foreground pl-1">
                          +{dayEvents.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected day events list */}
      {selectedDay && (
        <div className="border-t border-border shrink-0 bg-muted/10">
          <div className="px-4 py-2 border-b border-border/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {format(selectedDay, "EEEE, MMMM d")}
              </h3>
              <button
                type="button"
                onClick={() => onSlotClick(selectedDay, 10)}
                className="text-xs text-[#1773cf] hover:underline font-medium"
              >
                + Add event
              </button>
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {selectedDayEvents.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground text-center">
                No events scheduled
              </p>
            ) : (
              <div className="py-1">
                {selectedDayEvents.map((event) => {
                  const start = new Date(event.startTime)
                  const styles = EVENT_STYLES[event.type] ?? EVENT_STYLES.external

                  return (
                    <CalendarEventPopover
                      key={event.id}
                      event={event}
                      onEventDeleted={onEventDeleted}
                    >
                      <button
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/30 transition-colors",
                        )}
                      >
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            DOT_COLORS[event.type] ?? DOT_COLORS.external,
                          )}
                        />
                        <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                          {format(start, "h:mm a")}
                          {event.endTime && ` - ${format(new Date(event.endTime), "h:mm a")}`}
                        </span>
                        <span className={cn("text-xs font-medium truncate", styles.text)}>
                          {event.title}
                        </span>
                        {event.note && (
                          <span className="text-[10px] text-muted-foreground truncate ml-auto">
                            {event.note}
                          </span>
                        )}
                      </button>
                    </CalendarEventPopover>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
