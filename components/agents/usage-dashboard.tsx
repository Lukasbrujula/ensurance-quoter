"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Phone,
  Clock,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Info,
  Bot,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AiAgentStatus } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TELNYX_AI_COST_PER_MINUTE = 0.05 // USD

function estimateCost(minutes: number): number {
  return Math.round(minutes * TELNYX_AI_COST_PER_MINUTE * 100) / 100
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentUsageStats {
  id: string
  name: string
  status: AiAgentStatus
  total_calls: number
  total_minutes: number
  last_call_at: string | null
}

interface UsageData {
  agents: AgentUsageStats[]
  totals: {
    total_calls: number
    total_minutes: number
  }
}

type SortField = "name" | "total_calls" | "total_minutes" | "cost"
type SortDir = "asc" | "desc"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function UsageDashboard() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_timeRange, setTimeRange] = useState("all")
  const [sortField, setSortField] = useState<SortField>("total_calls")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const fetchUsage = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/agents/usage")
      if (!res.ok) throw new Error("Failed to fetch usage")
      const json = await res.json()
      setData(json)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load usage data"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchUsage()
  }, [fetchUsage])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  if (loading) return <UsageSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true)
            void fetchUsage()
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!data || data.agents.length === 0) {
    return <UsageEmptyState />
  }

  const sortedAgents = [...data.agents].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    if (sortField === "name") return a.name.localeCompare(b.name) * dir
    if (sortField === "total_calls") return (a.total_calls - b.total_calls) * dir
    if (sortField === "total_minutes")
      return (a.total_minutes - b.total_minutes) * dir
    if (sortField === "cost")
      return (
        (estimateCost(a.total_minutes) - estimateCost(b.total_minutes)) * dir
      )
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Time range filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage</h2>
        <Select value={_timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Phone}
          label="Total Calls"
          value={data.totals.total_calls.toString()}
        />
        <StatCard
          icon={Clock}
          label="Total Minutes"
          value={`${data.totals.total_minutes.toFixed(1)} min`}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <StatCard
                  icon={DollarSign}
                  label="Est. Cost"
                  value={`~$${estimateCost(data.totals.total_minutes).toFixed(2)}`}
                  extra={
                    <Info className="h-3 w-3 text-muted-foreground" />
                  }
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Based on Telnyx rate of ${TELNYX_AI_COST_PER_MINUTE.toFixed(2)}/min.
                Actual charges may vary.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Per-agent table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Agent Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    label="Agent Name"
                    field="name"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                  />
                  <TableHead>Status</TableHead>
                  <SortableHeader
                    label="Calls"
                    field="total_calls"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <SortableHeader
                    label="Minutes"
                    field="total_minutes"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                  <SortableHeader
                    label="Est. Cost"
                    field="cost"
                    current={sortField}
                    dir={sortDir}
                    onSort={handleSort}
                    className="text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Link
                        href={`/agents/${agent.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {agent.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <AgentStatusBadge status={agent.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.total_calls}
                    </TableCell>
                    <TableCell className="text-right">
                      {agent.total_minutes.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${estimateCost(agent.total_minutes).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  extra,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  extra?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            {extra}
          </div>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Sortable header                                                    */
/* ------------------------------------------------------------------ */

function SortableHeader({
  label,
  field,
  current,
  dir,
  onSort,
  className = "",
}: {
  label: string
  field: SortField
  current: SortField
  dir: SortDir
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = current === field
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {label}
        {isActive && (
          <span className="text-xs">{dir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </TableHead>
  )
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function AgentStatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-green-100 text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400"
      >
        Active
      </Badge>
    )
  }
  if (status === "error") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-red-100 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400"
      >
        Error
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="text-xs">
      Inactive
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function UsageEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Bot className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">No usage data yet</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Once your AI agents start handling calls, usage statistics will appear
          here.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function UsageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 pt-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
