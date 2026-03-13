"use client"

import { useEffect, useState, useCallback } from "react"
import { Bot, Phone, UserPlus, Clock, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface AiSummaryData {
  totalCalls: number
  leadsCreated: number
  pendingCallbacks: number
}

export function AiAgentSummaryWidget() {
  const [data, setData] = useState<AiSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch("/api/dashboard/widgets")
      if (!res.ok) throw new Error("Failed")
      const json = await res.json()
      setData(json.aiSummary)
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
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
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

  const metrics = [
    {
      label: "Calls Handled",
      value: data.totalCalls,
      icon: Phone,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "Leads Created",
      value: data.leadsCreated,
      icon: UserPlus,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Pending",
      value: data.pendingCallbacks,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Bot className="h-4 w-4 text-[#1773cf]" />
          AI Agent Summary
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">This week</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((m) => {
            const Icon = m.icon
            const [iconColor, iconBg] = m.color.split(" ")
            return (
              <div key={m.label} className="text-center">
                <div
                  className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}
                >
                  <Icon className={`h-4 w-4 ${iconColor}`} />
                </div>
                <p className="text-xl font-bold tabular-nums">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
