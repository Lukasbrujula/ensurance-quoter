"use client"

import { useEffect, useState, useCallback } from "react"
import { Phone, PhoneIncoming, Bot, Zap, Users, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import type { UsageStats } from "@/lib/supabase/usage"

/* ------------------------------------------------------------------ */
/*  Time range options                                                 */
/* ------------------------------------------------------------------ */

type TimeRange = "this_month" | "last_30" | "all_time"

function getDateRange(range: TimeRange): { since: string; until: string } {
  const now = new Date()
  const until = now.toISOString()

  switch (range) {
    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { since: startOfMonth.toISOString(), until }
    }
    case "last_30": {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
      return { since: thirtyDaysAgo.toISOString(), until }
    }
    case "all_time": {
      return { since: new Date(2020, 0, 1).toISOString(), until }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Usage bar component                                                */
/* ------------------------------------------------------------------ */

function UsageBar({
  label,
  value,
  unit,
  icon: Icon,
  maxValue,
}: {
  label: string
  value: number
  unit: string
  icon: typeof Phone
  maxValue: number
}) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <span className="text-[13px] font-semibold tabular-nums">
          {value} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[#1773cf] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function UsageClient() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>("this_month")

  const loadUsage = useCallback(async (range: TimeRange) => {
    try {
      setLoading(true)
      setError(null)
      const { since, until } = getDateRange(range)
      const res = await fetch(
        `/api/settings/usage?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
      )
      if (!res.ok) throw new Error("Failed to load usage data")
      const data: UsageStats = await res.json()
      setStats(data)
    } catch {
      setError("Unable to load usage data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsage(timeRange)
  }, [timeRange, loadUsage])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-[#e2e8f0]" />
        <div className="h-32 rounded bg-[#f1f5f9]" />
        <div className="h-32 rounded bg-[#f1f5f9]" />
        <div className="h-48 rounded bg-[#f1f5f9]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => loadUsage(timeRange)}>
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null

  const maxMinutes = Math.max(
    stats.calling.outboundMinutes,
    stats.calling.inboundMinutes,
    stats.calling.aiAgentMinutes,
    1,
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0f172a]">Usage</h1>
          <p className="mt-1 text-[13px] text-[#64748b]">
            Platform consumption and estimated costs.
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_30">Last 30 Days</SelectItem>
            <SelectItem value="all_time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* My Numbers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-bold uppercase tracking-[0.5px]">
            My Numbers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.phoneNumbers.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No phone numbers configured.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.phoneNumbers.map((pn, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-[#e2e8f0] px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[13px] font-medium tabular-nums">{pn.number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{pn.label}</span>
                    <Badge
                      variant={pn.status === "active" ? "default" : "secondary"}
                      className="text-[9px]"
                    >
                      {pn.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-bold uppercase tracking-[0.5px]">
            Calling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar
            label="Outbound Minutes"
            value={stats.calling.outboundMinutes}
            unit="min"
            icon={Phone}
            maxValue={maxMinutes}
          />
          <UsageBar
            label="Inbound Minutes"
            value={stats.calling.inboundMinutes}
            unit="min"
            icon={PhoneIncoming}
            maxValue={maxMinutes}
          />
          <UsageBar
            label="AI Agent Minutes"
            value={stats.calling.aiAgentMinutes}
            unit="min"
            icon={Bot}
            maxValue={maxMinutes}
          />
        </CardContent>
      </Card>

      {/* Platform Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-bold uppercase tracking-[0.5px]">
            Platform Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PlatformMetric label="Quotes Generated" value={stats.platform.quotesGenerated} icon={Zap} />
            <PlatformMetric label="Enrichment Lookups" value={stats.platform.enrichmentLookups} icon={Search} />
            <PlatformMetric label="Leads Created" value={stats.platform.leadsCreated} icon={Users} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Estimated Costs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[13px] font-bold uppercase tracking-[0.5px]">
            Estimated Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.costs.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              No usage recorded for this period.
            </p>
          ) : (
            <>
              <div className="overflow-hidden rounded-lg border border-[#e2e8f0]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f9fafb]">
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px]">Service</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px] text-right">Usage</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px] text-right">Rate</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px] text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.costs.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-[13px] font-medium">{item.service}</TableCell>
                        <TableCell className="text-right text-[13px] tabular-nums">{item.usage}</TableCell>
                        <TableCell className="text-right text-[12px] text-muted-foreground">{item.rate}</TableCell>
                        <TableCell className="text-right text-[13px] font-medium tabular-nums">
                          ${item.cost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-[#e2e8f0] bg-[#f9fafb]">
                      <TableCell colSpan={3} className="text-[13px] font-bold">
                        Total Estimated
                      </TableCell>
                      <TableCell className="text-right text-[14px] font-bold tabular-nums">
                        ${stats.totalCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Estimated based on standard rates. Actual charges may vary.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function PlatformMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Zap
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-[#e2e8f0] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff]">
        <Icon className="h-4 w-4 text-[#1773cf]" />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
