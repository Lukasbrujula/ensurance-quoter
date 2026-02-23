"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { addDays, isSameDay, isToday, format } from "date-fns"
import { cn } from "@/lib/utils"
import { CalendarEventPopover } from "@/components/dashboard/calendar-event-popover"
import type { CalendarEvent } from "@/components/dashboard/calendar-event-item"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const HOUR_HEIGHT = 60
const START_HOUR = 0
const END_HOUR = 24
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const TIME_COL_WIDTH = 56

function formatHour(hour: number): string {
  if (hour === 0) return "00:00"
  return `${String(hour).padStart(2, "0")}:00`
}

/* ------------------------------------------------------------------ */
/*  Event colors                                                       */
/* ------------------------------------------------------------------ */

const EVENT_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  follow_up: { bg: "bg-green-100", border: "border-green-300", text: "text-green-900" },
  ai_callback: { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-900" },
  external: { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-900" },
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FullWeekViewProps {
  weekStart: Date
  events: CalendarEvent[]
  onSlotClick: (date: Date, hour: number) => void
  onEventDeleted: () => void
  onDayClick: (date: Date) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FullWeekView({
  weekStart,
  events,
  onSlotClick,
  onEventDeleted,
  onDayClick,
}: FullWeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )

  // Scroll to ~8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT - 20
    }
  }, [weekStart])

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentMinute(now.getHours() * 60 + now.getMinutes())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  /** Group events by day index */
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const event of events) {
      const start = new Date(event.startTime)
      const dayIdx = days.findIndex((d) => isSameDay(d, start))
      if (dayIdx === -1) continue
      const existing = map.get(dayIdx) ?? []
      map.set(dayIdx, [...existing, event])
    }
    return map
  }, [events, days])

  const todayDayIdx = days.findIndex((d) => isToday(d))
  const currentTimeTop = (currentMinute / 60) * HOUR_HEIGHT

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers (sticky) */}
      <div
        className="flex border-b border-border shrink-0"
        style={{ paddingLeft: TIME_COL_WIDTH }}
      >
        {days.map((day, i) => {
          const today = isToday(day)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "flex-1 flex flex-col items-center py-2 transition-colors hover:bg-muted/30",
                i > 0 && "border-l border-border",
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground uppercase">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  today
                    ? "bg-[#1773cf] text-white"
                    : "text-foreground",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          )
        })}
      </div>

      {/* All-day row */}
      <div
        className="flex border-b border-border shrink-0 min-h-6"
        style={{ paddingLeft: TIME_COL_WIDTH }}
      >
        <div
          className="absolute text-[10px] text-muted-foreground pr-2 pt-1 text-right"
          style={{ width: TIME_COL_WIDTH, left: 0 }}
        >
          all-day
        </div>
        {days.map((_, i) => (
          <div
            key={i}
            className={cn("flex-1", i > 0 && "border-l border-border")}
          />
        ))}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div
          className="relative"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          {/* Hour lines + time labels */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-border/50"
              style={{ top: hour * HOUR_HEIGHT }}
            >
              <div
                className="absolute text-[10px] text-muted-foreground text-right pr-2 -translate-y-1/2"
                style={{ width: TIME_COL_WIDTH }}
              >
                {hour > 0 ? formatHour(hour) : ""}
              </div>
            </div>
          ))}

          {/* Day columns */}
          <div
            className="absolute inset-0"
            style={{ left: TIME_COL_WIDTH }}
          >
            <div className="flex h-full" style={{ width: `calc(100%)` }}>
              {days.map((day, dayIdx) => {
                const dayEvents = eventsByDay.get(dayIdx) ?? []
                const today = dayIdx === todayDayIdx

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      "flex-1 relative",
                      dayIdx > 0 && "border-l border-border/50",
                      today && "bg-blue-50/30",
                    )}
                  >
                    {/* Clickable hour slots */}
                    {HOURS.map((hour) => (
                      <button
                        key={hour}
                        type="button"
                        className="absolute w-full hover:bg-muted/20 transition-colors"
                        style={{
                          top: hour * HOUR_HEIGHT,
                          height: HOUR_HEIGHT,
                        }}
                        onClick={() => onSlotClick(day, hour)}
                        aria-label={`Add event on ${format(day, "EEE MMM d")} at ${formatHour(hour)}`}
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const start = new Date(event.startTime)
                      const startMin = start.getHours() * 60 + start.getMinutes()
                      let durationMin = 30
                      if (event.endTime) {
                        const end = new Date(event.endTime)
                        durationMin = Math.max(
                          15,
                          (end.getTime() - start.getTime()) / 60_000,
                        )
                      }
                      const top = (startMin / 60) * HOUR_HEIGHT
                      const height = Math.max(
                        20,
                        (durationMin / 60) * HOUR_HEIGHT,
                      )
                      const styles =
                        EVENT_STYLES[event.type] ?? EVENT_STYLES.external

                      return (
                        <CalendarEventPopover
                          key={event.id}
                          event={event}
                          onEventDeleted={onEventDeleted}
                        >
                          <button
                            type="button"
                            className={cn(
                              "absolute left-0.5 right-0.5 rounded-md border px-1.5 py-0.5 text-left overflow-hidden cursor-pointer transition-opacity hover:opacity-80 z-10",
                              styles.bg,
                              styles.border,
                              styles.text,
                            )}
                            style={{ top, height: Math.min(height, 200) }}
                          >
                            <p className="text-[10px] font-semibold leading-tight truncate">
                              {event.title}
                            </p>
                            <p className="text-[9px] opacity-70 leading-tight">
                              {format(start, "h:mm a")}
                            </p>
                            {event.note && height > 40 && (
                              <p className="text-[9px] opacity-60 truncate mt-0.5">
                                {event.note}
                              </p>
                            )}
                          </button>
                        </CalendarEventPopover>
                      )
                    })}

                    {/* Current time indicator */}
                    {today && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: currentTimeTop }}
                      >
                        <div className="flex items-center">
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                          <div className="flex-1 h-px bg-red-500" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
