"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Calendar, RefreshCw } from "lucide-react"
import { format, isToday, isTomorrow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface CalendarEvent {
  id: string
  type: "follow_up" | "ai_callback" | "external"
  title: string
  startTime: string
  endTime?: string
  leadId?: string
  source: "ensurance" | "google" | "both"
}

export function CalendarPreviewWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)

      const now = new Date()
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const res = await fetch(
        `/api/dashboard/calendar?start=${now.toISOString()}&end=${end.toISOString()}`,
      )
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setEvents((json.events ?? []).slice(0, 5))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-xs text-muted-foreground">Unable to load</p>
          <Button variant="ghost" size="sm" className="mt-2 h-7" onClick={load}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <Calendar className="h-4 w-4 text-[#1773cf]" />
            Upcoming Events
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
            <Link href="/calendar">View Calendar</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">
              No upcoming events
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[200px] min-h-[80px]">
            <div className="space-y-1">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function EventRow({ event }: { event: CalendarEvent }) {
  const startDate = new Date(event.startTime)
  const dayLabel = isToday(startDate)
    ? "Today"
    : isTomorrow(startDate)
      ? "Tomorrow"
      : format(startDate, "MMM d")

  const timeStr = format(startDate, "h:mm a")
  const href = event.leadId ? `/leads/${event.leadId}` : "/calendar"

  const typeBadge =
    event.type === "follow_up"
      ? "Follow-up"
      : event.type === "ai_callback"
        ? "AI Callback"
        : "Event"

  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50">
        <Calendar className="h-3.5 w-3.5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{event.title}</p>
          <Badge variant="outline" className="h-4 px-1 text-[9px]">
            {typeBadge}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {dayLabel} at {timeStr}
        </p>
      </div>
    </Link>
  )
}
