"use client"

import { useEffect, useState, useCallback } from "react"
import { Award, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface CarrierCount {
  name: string
  count: number
}

export function TopCarriersWidget() {
  const [carriers, setCarriers] = useState<CarrierCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch("/api/dashboard/widgets")
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setCarriers(json.topCarriers ?? [])
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
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
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

  const maxCount = carriers.length > 0 ? carriers[0].count : 1

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Award className="h-4 w-4 text-[#1773cf]" />
          Top Carriers
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">Most quoted this month</p>
      </CardHeader>
      <CardContent>
        {carriers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-[13px] text-muted-foreground">
              No quotes this month
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {carriers.map((carrier, idx) => {
              const pct = (carrier.count / maxCount) * 100
              return (
                <div key={carrier.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px] font-medium">
                      <span className="mr-1.5 text-muted-foreground">
                        {idx + 1}.
                      </span>
                      {carrier.name}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {carrier.count} {carrier.count === 1 ? "quote" : "quotes"}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#1773cf]"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
