"use client"

import { useEffect, useState, useCallback } from "react"
import { Clock, RefreshCw, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface ResponseTimeData {
  thisWeekMinutes: number | null
  lastWeekMinutes: number | null
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remaining = mins % 60
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}

export function AvgResponseTimeWidget() {
  const [data, setData] = useState<ResponseTimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch("/api/dashboard/widgets")
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setData(json.avgResponseTime)
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
        <CardContent className="pt-6">
          <Skeleton className="mb-2 h-4 w-28" />
          <Skeleton className="mb-1 h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-muted-foreground">Unable to load</p>
          <Button variant="ghost" size="sm" className="mt-2 h-7" onClick={load}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const current = data?.thisWeekMinutes
  const previous = data?.lastWeekMinutes
  const improved =
    current !== null &&
    previous !== null &&
    current !== undefined &&
    previous !== undefined &&
    current < previous

  const trendText =
    current !== null &&
    previous !== null &&
    current !== undefined &&
    previous !== undefined
      ? improved
        ? `${formatMinutes(previous - current)} faster than last week`
        : current > previous
          ? `${formatMinutes(current - previous)} slower than last week`
          : "Same as last week"
      : "No prior data"

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Avg Response Time
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {current !== null && current !== undefined
                ? formatMinutes(current)
                : "—"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              {improved ? (
                <TrendingDown className="h-3 w-3 text-green-500" />
              ) : current !== null &&
                previous !== null &&
                current !== undefined &&
                previous !== undefined &&
                current > previous ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : null}
              {trendText}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff]">
            <Clock className="h-5 w-5 text-[#1773cf]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
