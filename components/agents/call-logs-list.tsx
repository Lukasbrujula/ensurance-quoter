"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Check,
  AlertTriangle,
  Clock,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AgentCallLog {
  id: string
  lead_id: string
  direction: string
  duration_seconds: number | null
  started_at: string | null
  caller_name: string | null
  caller_phone: string | null
  extraction_status: string | null
  extracted_data: Record<string, unknown> | null
  provider_call_id: string | null
}

interface DateGroup {
  label: string
  calls: AgentCallLog[]
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const callDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (today.getTime() - callDay.getTime()) / 86_400_000,
  )

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "0:00"
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${String(sec).padStart(2, "0")}`
}

function groupByDate(calls: AgentCallLog[]): DateGroup[] {
  const groups = new Map<string, AgentCallLog[]>()

  for (const call of calls) {
    const key = call.started_at ? getDateLabel(call.started_at) : "Unknown"
    const existing = groups.get(key)
    if (existing) {
      existing.push(call)
    } else {
      groups.set(key, [call])
    }
  }

  return Array.from(groups.entries()).map(([label, groupCalls]) => ({
    label,
    calls: groupCalls,
  }))
}

/* ------------------------------------------------------------------ */
/*  Extraction status badge                                            */
/* ------------------------------------------------------------------ */

function ExtractionBadge({ status }: { status: string | null }) {
  if (status === "completed") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0"
      >
        <Check className="h-2.5 w-2.5" />
        Extracted
      </Badge>
    )
  }

  if (status === "partial") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0"
      >
        <AlertTriangle className="h-2.5 w-2.5" />
        Partial
      </Badge>
    )
  }

  if (status === "failed") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5 py-0"
      >
        <X className="h-2.5 w-2.5" />
        Review
      </Badge>
    )
  }

  if (status === "pending" || status === "processing") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 text-[10px] px-1.5 py-0"
      >
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        Processing
      </Badge>
    )
  }

  return null
}

/* ------------------------------------------------------------------ */
/*  Call row                                                            */
/* ------------------------------------------------------------------ */

function CallRow({
  call,
  isSelected,
  onClick,
}: {
  call: AgentCallLog
  isSelected: boolean
  onClick: () => void
}) {
  const isInbound = call.direction === "inbound"
  const DirectionIcon = isInbound ? PhoneIncoming : PhoneOutgoing

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer",
        isSelected
          ? "bg-primary/5 ring-1 ring-primary"
          : "hover:bg-muted/50",
      )}
    >
      {/* Direction icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isInbound
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        )}
      >
        <DirectionIcon className="h-3.5 w-3.5" />
      </div>

      {/* Caller info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {call.caller_name || "Unknown Caller"}
          </p>
          <ExtractionBadge status={call.extraction_status} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {call.caller_phone && (
            <span className="flex items-center gap-1 font-mono">
              <Phone className="h-2.5 w-2.5" />
              {call.caller_phone}
            </span>
          )}
        </div>
      </div>

      {/* Duration + time */}
      <div className="shrink-0 text-right">
        {call.duration_seconds !== null && call.duration_seconds > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono tabular-nums">
              {formatDuration(call.duration_seconds)}
            </span>
          </div>
        )}
        {call.started_at && (
          <p className="text-[11px] text-muted-foreground/60">
            {formatTime(call.started_at)}
          </p>
        )}
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function CallLogsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full rounded-md" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-16 mb-2" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Phone className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="mt-3 text-sm font-medium">
        {hasSearch ? "No matching calls" : "No calls yet"}
      </h3>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        {hasSearch
          ? "Try a different search term."
          : "When your AI agent handles calls, they'll appear here with extracted caller information."}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CallLogsListProps {
  agentId: string
  /** Called when a call row is selected (for detail panel in Task 11) */
  onSelectCall?: (callId: string) => void
  /** Currently selected call ID */
  selectedCallId?: string | null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CallLogsList({
  agentId,
  onSelectCall,
  selectedCallId,
}: CallLogsListProps) {
  const [calls, setCalls] = useState<AgentCallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchCalls = useCallback(
    async (cursor?: string | null) => {
      const isLoadMore = Boolean(cursor)
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const params = new URLSearchParams({ limit: "50" })
        if (cursor) params.set("cursor", cursor)

        const res = await fetch(`/api/agents/${agentId}/calls?${params}`)
        if (!res.ok) throw new Error("Failed to fetch calls")

        const data = await res.json()
        const newCalls: AgentCallLog[] = data.calls ?? []

        if (isLoadMore) {
          setCalls((prev) => [...prev, ...newCalls])
        } else {
          setCalls(newCalls)
        }
        setNextCursor(data.nextCursor ?? null)
      } catch (error) {
        console.error(
          "fetchCalls error:",
          error instanceof Error ? error.message : String(error),
        )
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [agentId],
  )

  useEffect(() => {
    void fetchCalls()
  }, [fetchCalls])

  // Client-side search filtering
  const filteredCalls = useMemo(() => {
    if (!search.trim()) return calls
    const q = search.toLowerCase()
    return calls.filter(
      (c) =>
        (c.caller_name && c.caller_name.toLowerCase().includes(q)) ||
        (c.caller_phone && c.caller_phone.includes(q)),
    )
  }, [calls, search])

  const dateGroups = useMemo(() => groupByDate(filteredCalls), [filteredCalls])

  if (loading) return <CallLogsSkeleton />

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Call list */}
      {filteredCalls.length === 0 ? (
        <EmptyState hasSearch={search.trim().length > 0} />
      ) : (
        <div className="space-y-4">
          {dateGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.calls.map((call) => (
                  <CallRow
                    key={call.id}
                    call={call}
                    isSelected={selectedCallId === call.id}
                    onClick={() => onSelectCall?.(call.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {nextCursor && !search.trim() && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void fetchCalls(nextCursor)}
                disabled={loadingMore}
                className="gap-2 text-xs"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load older calls"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
