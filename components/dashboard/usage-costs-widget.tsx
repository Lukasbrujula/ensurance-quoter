"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Activity, Phone, Bot, MessageSquare, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface UsageData {
  calling: {
    outboundMinutes: number
    inboundMinutes: number
    aiAgentMinutes: number
  }
  platform: {
    quotesGenerated: number
    enrichmentLookups: number
    leadsCreated: number
  }
  totalCost: number
}

export function UsageCostsWidget() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const res = await fetch("/api/settings/usage")
      if (!res.ok) throw new Error("Failed")
      const json: UsageData = await res.json()
      setData(json)
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
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
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

  const humanMinutes = data.calling.outboundMinutes + data.calling.inboundMinutes

  const rows = [
    {
      label: "Human calls",
      value: `${humanMinutes} min`,
      icon: Phone,
      color: "text-violet-600 bg-violet-50",
    },
    {
      label: "AI agent calls",
      value: `${data.calling.aiAgentMinutes} min`,
      icon: Bot,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Quotes generated",
      value: String(data.platform.quotesGenerated),
      icon: Activity,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "SMS messages",
      value: "—",
      icon: MessageSquare,
      color: "text-teal-600 bg-teal-50",
    },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <Activity className="h-4 w-4 text-[#1773cf]" />
            Usage & Costs
          </CardTitle>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
          >
            <Link href="/settings/usage">Details</Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">This month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => {
            const Icon = row.icon
            const [iconColor, iconBg] = row.color.split(" ")
            return (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded ${iconBg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                  </div>
                  <span className="text-[13px] text-muted-foreground">
                    {row.label}
                  </span>
                </div>
                <span className="text-[13px] font-medium tabular-nums">
                  {row.value}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Est. total cost
          </span>
          <span className="text-lg font-bold tabular-nums text-[#059669]">
            ${data.totalCost.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
