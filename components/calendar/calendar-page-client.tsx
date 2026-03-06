"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react"
import { format, addDays, addMonths, startOfMonth, endOfMonth, isToday } from "date-fns"
import { Button } from "@/components/ui/button"
import { FullWeekView } from "./full-week-view"
import { FullDayView } from "./full-day-view"
import { FullMonthView } from "./full-month-view"
import { AddCalendarEventDialog } from "@/components/dashboard/add-calendar-event-dialog"
import type { CalendarEvent } from "@/components/dashboard/calendar-event-item"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ViewMode = "day" | "week" | "month"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getWeekStart(offset: number): Date {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  const start = new Date(now)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return start
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarPageClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [googleConnected, setGoogleConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add event dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogDate, setAddDialogDate] = useState<Date | undefined>()
  const [addDialogHour, setAddDialogHour] = useState<number | undefined>()

  const weekStart = getWeekStart(weekOffset)

  const currentMonth = addMonths(new Date(), monthOffset)

  const loadEvents = useCallback(async () => {
    let start: Date
    let end: Date
    if (viewMode === "month") {
      start = startOfMonth(addMonths(new Date(), monthOffset))
      end = endOfMonth(start)
    } else {
      start = getWeekStart(weekOffset)
      end = addDays(start, 7)
    }
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `/api/dashboard/calendar?start=${start.toISOString()}&end=${end.toISOString()}`,
      )
      if (!res.ok) throw new Error("Failed to load calendar")
      const data = await res.json()
      setEvents(data.events ?? [])
      setGoogleConnected(data.googleConnected ?? false)
    } catch {
      setError("Unable to load calendar events")
    } finally {
      setLoading(false)
    }
  }, [weekOffset, monthOffset, viewMode])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  function handleSlotClick(date: Date, hour: number) {
    setAddDialogDate(date)
    setAddDialogHour(hour)
    setAddDialogOpen(true)
  }

  function handleAddClick() {
    setAddDialogDate(viewMode === "day" ? selectedDay : new Date())
    setAddDialogHour(10)
    setAddDialogOpen(true)
  }

  function handleDayClick(date: Date) {
    setSelectedDay(date)
    if (viewMode !== "month") {
      setViewMode("day")
    }
  }

  function handleMonthDayClick(date: Date) {
    setSelectedDay(date)
  }

  function handlePrev() {
    if (viewMode === "month") {
      setMonthOffset((m) => m - 1)
    } else if (viewMode === "week") {
      setWeekOffset((w) => w - 1)
    } else {
      const prev = addDays(selectedDay, -1)
      setSelectedDay(prev)
      if (prev < getWeekStart(weekOffset)) {
        setWeekOffset((w) => w - 1)
      }
    }
  }

  function handleNext() {
    if (viewMode === "month") {
      setMonthOffset((m) => m + 1)
    } else if (viewMode === "week") {
      setWeekOffset((w) => w + 1)
    } else {
      const next = addDays(selectedDay, 1)
      setSelectedDay(next)
      if (next >= addDays(getWeekStart(weekOffset), 7)) {
        setWeekOffset((w) => w + 1)
      }
    }
  }

  function handleToday() {
    setWeekOffset(0)
    setMonthOffset(0)
    setSelectedDay(new Date())
  }

  const showTodayButton =
    viewMode === "month"
      ? monthOffset !== 0
      : viewMode === "week"
        ? weekOffset !== 0
        : !isToday(selectedDay)

  // Title: "February 2026" style
  const titleDate = viewMode === "month" ? currentMonth : viewMode === "week" ? weekStart : selectedDay
  const monthTitle = format(titleDate, "MMMM yyyy")

  return (
    <div className="flex h-full flex-col">
      {/* Apple Calendar-style header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0 bg-background">
        {/* Left: Month title + add button */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight">{monthTitle}</h1>
          <Button
            size="sm"
            className="h-8 bg-[#1773cf] hover:bg-[#1565b8] text-white gap-1.5"
            onClick={handleAddClick}
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>

        {/* Center: View toggle */}
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`rounded-md px-4 py-1 text-xs font-medium transition-colors ${
              viewMode === "day"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-md px-4 py-1 text-xs font-medium transition-colors ${
              viewMode === "week"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`rounded-md px-4 py-1 text-xs font-medium transition-colors ${
              viewMode === "month"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Month
          </button>
        </div>

        {/* Right: Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {showTodayButton && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3"
              onClick={handleToday}
            >
              Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Google Calendar CTA */}
      {!googleConnected && !loading && (
        <div className="flex items-center justify-between border-b border-border bg-blue-50 px-6 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-blue-200 shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="#4285F4" strokeWidth="1.5" />
                <path d="M16 2v4M8 2v4M4 10h16" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="15" r="1.5" fill="#34A853" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Sync with Google Calendar
              </p>
              <p className="text-xs text-muted-foreground">
                See all your events alongside follow-ups in one place
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-[#1773cf] hover:bg-[#1565b8] text-white shrink-0">
            <Link href="/settings/integrations">
              Connect Google Calendar
            </Link>
          </Button>
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={loadEvents}>
            Retry
          </Button>
        </div>
      ) : viewMode === "month" ? (
        <FullMonthView
          currentDate={currentMonth}
          events={events}
          selectedDay={selectedDay}
          onDayClick={handleMonthDayClick}
          onSlotClick={handleSlotClick}
          onEventDeleted={loadEvents}
        />
      ) : viewMode === "week" ? (
        <FullWeekView
          weekStart={weekStart}
          events={events}
          onSlotClick={handleSlotClick}
          onEventDeleted={loadEvents}
          onDayClick={handleDayClick}
        />
      ) : (
        <FullDayView
          date={selectedDay}
          events={events}
          onSlotClick={handleSlotClick}
          onEventDeleted={loadEvents}
        />
      )}

      {/* Add Event Dialog */}
      <AddCalendarEventDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        initialDate={addDialogDate}
        initialHour={addDialogHour}
        onEventCreated={loadEvents}
      />
    </div>
  )
}
