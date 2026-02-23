"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  LayoutGrid,
  CalendarDays,
} from "lucide-react"
import { format, addDays, isToday } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarWeekGrid } from "./calendar-week-grid"
import { CalendarDayGrid } from "./calendar-day-grid"
import { AddCalendarEventDialog } from "./add-calendar-event-dialog"
import type { CalendarEvent } from "./calendar-event-item"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type ViewMode = "week" | "day"

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

export function CalendarView() {
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [googleConnected, setGoogleConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add event dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogDate, setAddDialogDate] = useState<Date | undefined>()
  const [addDialogHour, setAddDialogHour] = useState<number | undefined>()

  const weekStart = getWeekStart(weekOffset)

  const loadEvents = useCallback(async () => {
    const start = getWeekStart(weekOffset)
    const end = addDays(start, 7)
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
  }, [weekOffset])

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
    setViewMode("day")
  }

  function handlePrev() {
    if (viewMode === "week") {
      setWeekOffset((w) => w - 1)
    } else {
      const prev = addDays(selectedDay, -1)
      setSelectedDay(prev)
      // Adjust week offset if we moved to a different week
      const weekStartDate = getWeekStart(weekOffset)
      if (prev < weekStartDate) {
        setWeekOffset((w) => w - 1)
      }
    }
  }

  function handleNext() {
    if (viewMode === "week") {
      setWeekOffset((w) => w + 1)
    } else {
      const next = addDays(selectedDay, 1)
      setSelectedDay(next)
      const weekEndDate = addDays(getWeekStart(weekOffset), 7)
      if (next >= weekEndDate) {
        setWeekOffset((w) => w + 1)
      }
    }
  }

  function handleToday() {
    setWeekOffset(0)
    setSelectedDay(new Date())
  }

  const showTodayButton =
    viewMode === "week" ? weekOffset !== 0 : !isToday(selectedDay)

  const headerTitle =
    viewMode === "week"
      ? `${format(weekStart, "MMM d")} \u2013 ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
      : format(selectedDay, "MMM d, yyyy")

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        {/* Row 1: Title + View toggle + Add */}
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <CalendarIcon className="h-4 w-4 text-[#1773cf]" />
            Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            {/* View toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "week" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-r-none"
                onClick={() => setViewMode("week")}
                title="Week view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "day" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-l-none border-l"
                onClick={() => setViewMode("day")}
                title="Day view"
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleAddClick}
              title="Add event"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Row 2: Navigation + date range */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground font-medium">
            {headerTitle}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {showTodayButton && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={handleToday}
              >
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleNext}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadEvents}
            >
              Retry
            </Button>
          </div>
        ) : viewMode === "week" ? (
          <CalendarWeekGrid
            weekStart={weekStart}
            events={events}
            onSlotClick={handleSlotClick}
            onEventDeleted={loadEvents}
            onDayClick={handleDayClick}
          />
        ) : (
          <CalendarDayGrid
            date={selectedDay}
            events={events}
            onSlotClick={handleSlotClick}
            onEventDeleted={loadEvents}
          />
        )}

        {!googleConnected && !loading && (
          <div className="mt-2 border-t pt-2 text-center text-xs text-muted-foreground">
            <Link
              href="/settings/integrations"
              className="text-primary hover:underline"
            >
              Connect Google Calendar
            </Link>{" "}
            to see all your events here
          </div>
        )}
      </CardContent>

      {/* Add Event Dialog */}
      <AddCalendarEventDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        initialDate={addDialogDate}
        initialHour={addDialogHour}
        onEventCreated={loadEvents}
      />
    </Card>
  )
}
