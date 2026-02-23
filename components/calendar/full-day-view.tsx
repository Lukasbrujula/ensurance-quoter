"use client"

import { useMemo, useEffect, useRef, useState } from "react"
import { isSameDay, isToday as checkIsToday, format } from "date-fns"
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

interface FullDayViewProps {
  date: Date
  events: CalendarEvent[]
  onSlotClick: (date: Date, hour: number) => void
  onEventDeleted: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FullDayView({
  date,
  events,
  onSlotClick,
  onEventDeleted,
}: FullDayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = checkIsToday(date)

  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  })

  // Scroll to ~8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT - 20
    }
  }, [date])

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentMinute(now.getHours() * 60 + now.getMinutes())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  /** Filter events for this day */
  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(new Date(e.startTime), date)),
    [events, date],
  )

  const currentTimeTop = (currentMinute / 60) * HOUR_HEIGHT

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day header (sticky) */}
      <div className="flex items-center border-b border-border shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
              today ? "bg-[#1773cf] text-white" : "text-foreground",
            )}
          >
            {format(date, "d")}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {format(date, "EEEE")}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(date, "MMMM yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* All-day row */}
      <div className="flex border-b border-border shrink-0 min-h-6" style={{ paddingLeft: TIME_COL_WIDTH }}>
        <div
          className="text-[10px] text-muted-foreground text-right pr-2 pt-1"
          style={{ width: TIME_COL_WIDTH, marginLeft: -TIME_COL_WIDTH }}
        >
          all-day
        </div>
        <div className="flex-1" />
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <div
          className="relative"
          style={{ height: HOURS.length * HOUR_HEIGHT }}
        >
          {/* Hour lines + labels */}
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

          {/* Event area */}
          <div
            className={cn(
              "absolute inset-0",
              today && "bg-blue-50/20",
            )}
            style={{ left: TIME_COL_WIDTH }}
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
                onClick={() => onSlotClick(date, hour)}
                aria-label={`Add event at ${formatHour(hour)}`}
              />
            ))}

            {/* Events */}
            {dayEvents.map((event) => {
              const start = new Date(event.startTime)
              const startMin = start.getHours() * 60 + start.getMinutes()
              let durationMin = 30
              if (event.endTime) {
                const end = new Date(event.endTime)
                durationMin = Math.max(15, (end.getTime() - start.getTime()) / 60_000)
              }
              const top = (startMin / 60) * HOUR_HEIGHT
              const height = Math.max(24, (durationMin / 60) * HOUR_HEIGHT)
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
                      "absolute left-1 right-1 rounded-md border px-3 py-1 text-left overflow-hidden cursor-pointer transition-opacity hover:opacity-80 z-10",
                      styles.bg,
                      styles.border,
                      styles.text,
                    )}
                    style={{ top, height: Math.min(height, 300) }}
                  >
                    <p className="text-xs font-semibold leading-tight truncate">
                      {event.title}
                    </p>
                    <p className="text-[10px] opacity-70">
                      {format(start, "h:mm a")}
                      {event.endTime && ` – ${format(new Date(event.endTime), "h:mm a")}`}
                    </p>
                    {event.note && height > 50 && (
                      <p className="text-[10px] opacity-60 truncate mt-0.5">
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
        </div>
      </div>
    </div>
  )
}
