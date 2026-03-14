"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import {
  Phone,
  Calculator,
  MessageSquare,
  Pencil,
  Settings,
  History,
  CalendarDays,
  X,
  Loader2,
  ChevronDown,
  Mail,
  ArrowRight,
  Users,
  Zap,
} from "lucide-react"
import {
  format,
  parseISO,
  isToday,
  isYesterday,
  startOfDay,
  endOfDay,
  isAfter,
  subDays,
} from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ScopeToggle, getDefaultScope, type Scope } from "@/components/shared/scope-toggle"
import type { ActivityType } from "@/lib/types/activity"
import type { HistoryCategory } from "@/lib/supabase/activities"

/* ------------------------------------------------------------------ */
/*  Category tab config                                                */
/* ------------------------------------------------------------------ */

interface CategoryTab {
  key: HistoryCategory
  label: string
  icon: typeof Phone
  iconColor: string
}

const CATEGORY_TABS: CategoryTab[] = [
  { key: "all", label: "All", icon: History, iconColor: "text-foreground" },
  { key: "calls", label: "Calls", icon: Phone, iconColor: "text-blue-600" },
  { key: "quotes", label: "Quotes", icon: Calculator, iconColor: "text-green-600" },
  { key: "messages", label: "Messages", icon: MessageSquare, iconColor: "text-purple-600" },
  { key: "notes", label: "Notes", icon: Pencil, iconColor: "text-yellow-600" },
  { key: "system", label: "System", icon: Settings, iconColor: "text-muted-foreground" },
]

/* ------------------------------------------------------------------ */
/*  Activity type → visual config                                      */
/* ------------------------------------------------------------------ */

interface ActivityTypeConfig {
  label: string
  icon: typeof Phone
  iconColor: string
  iconBg: string
}

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  call: { label: "Call", icon: Phone, iconColor: "text-blue-600", iconBg: "bg-blue-50 dark:bg-blue-950" },
  quote: { label: "Quote", icon: Calculator, iconColor: "text-green-600", iconBg: "bg-green-50 dark:bg-green-950" },
  sms_sent: { label: "SMS Sent", icon: MessageSquare, iconColor: "text-purple-600", iconBg: "bg-purple-50 dark:bg-purple-950" },
  sms_received: { label: "SMS Received", icon: MessageSquare, iconColor: "text-purple-600", iconBg: "bg-purple-50 dark:bg-purple-950" },
  email_sent: { label: "Email Sent", icon: Mail, iconColor: "text-purple-600", iconBg: "bg-purple-50 dark:bg-purple-950" },
  note: { label: "Note", icon: Pencil, iconColor: "text-yellow-600", iconBg: "bg-yellow-50 dark:bg-yellow-950" },
  status_change: { label: "Status Changed", icon: ArrowRight, iconColor: "text-muted-foreground", iconBg: "bg-muted" },
  enrichment: { label: "Enrichment", icon: Users, iconColor: "text-muted-foreground", iconBg: "bg-muted" },
  lead_created: { label: "Lead Created", icon: Users, iconColor: "text-muted-foreground", iconBg: "bg-muted" },
  lead_updated: { label: "Lead Updated", icon: Zap, iconColor: "text-muted-foreground", iconBg: "bg-muted" },
  follow_up: { label: "Follow-up", icon: CalendarDays, iconColor: "text-muted-foreground", iconBg: "bg-muted" },
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HistoryEntry {
  id: string
  leadId: string
  leadName: string
  activityType: ActivityType
  title: string
  details: Record<string, unknown> | null
  createdAt: string
}

interface DateGroup {
  label: string
  entries: HistoryEntry[]
}

/* ------------------------------------------------------------------ */
/*  Date grouping helper                                               */
/* ------------------------------------------------------------------ */

function groupByDate(entries: HistoryEntry[]): DateGroup[] {
  const groups: Map<string, HistoryEntry[]> = new Map()
  const now = new Date()
  const weekAgo = startOfDay(subDays(now, 7))

  for (const entry of entries) {
    const date = parseISO(entry.createdAt)
    let label: string
    if (isToday(date)) {
      label = "Today"
    } else if (isYesterday(date)) {
      label = "Yesterday"
    } else if (isAfter(date, weekAgo)) {
      label = "This Week"
    } else {
      label = "Earlier"
    }

    const existing = groups.get(label)
    if (existing) {
      existing.push(entry)
    } else {
      groups.set(label, [entry])
    }
  }

  // Maintain order: Today, Yesterday, This Week, Earlier
  const order = ["Today", "Yesterday", "This Week", "Earlier"]
  const result: DateGroup[] = []
  for (const label of order) {
    const entries = groups.get(label)
    if (entries && entries.length > 0) {
      result.push({ label, entries })
    }
  }
  return result
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 30

export function HistoryClient() {
  const { orgId, orgRole } = useAuth()
  const [scope, setScope] = useState<Scope>(() => getDefaultScope(orgId, orgRole))
  const [category, setCategory] = useState<HistoryCategory>("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<Record<HistoryCategory, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchHistory = useCallback(async (
    cat: HistoryCategory,
    off: number,
    from?: Date,
    to?: Date,
    append = false,
    scopeOverride?: Scope,
  ) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams({
        category: cat,
        limit: String(PAGE_SIZE),
        offset: String(off),
      })
      if (!append && off === 0) params.set("counts", "true")
      if (from) params.set("dateFrom", startOfDay(from).toISOString())
      if (to) params.set("dateTo", endOfDay(to).toISOString())
      const effectiveScope = scopeOverride ?? scope
      if (effectiveScope === "team") params.set("scope", "team")

      const res = await fetch(`/api/activity-log/history?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch")

      const data = await res.json()

      if (append) {
        setEntries((prev) => [...prev, ...data.entries])
      } else {
        setEntries(data.entries)
      }
      setTotal(data.total)
      if (data.counts) setCounts(data.counts)
    } catch (error) {
      console.error("[history] Fetch failed:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Fetch on category/date/scope change
  useEffect(() => {
    setOffset(0)
    fetchHistory(category, 0, dateFrom, dateTo, false, scope)
  }, [category, dateFrom, dateTo, scope, fetchHistory])

  const handleLoadMore = useCallback(() => {
    const nextOffset = offset + PAGE_SIZE
    setOffset(nextOffset)
    fetchHistory(category, nextOffset, dateFrom, dateTo, true)
  }, [offset, category, dateFrom, dateTo, fetchHistory])

  const hasMore = entries.length < total

  const dateGroups = useMemo(() => groupByDate(entries), [entries])

  const hasDateFilter = dateFrom !== undefined || dateTo !== undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Activity History</h1>
          <p className="text-sm text-muted-foreground">
            All broker activity in reverse chronological order
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScopeToggle scope={scope} onScopeChange={setScope} />
          <p className="text-sm text-muted-foreground tabular-nums">
            {total} {total === 1 ? "entry" : "entries"}
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b pb-px">
        {CATEGORY_TABS.map((tab) => {
          const isActive = category === tab.key
          const Icon = tab.icon
          const count = counts?.[tab.key]
          return (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              className={`
                flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors
                ${isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground/80"
                }
              `}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? tab.iconColor : ""}`} />
              {tab.label}
              {count !== undefined && count > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 min-w-5 px-1 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
          </PopoverContent>
        </Popover>

        {hasDateFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear dates
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <History className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasDateFilter
              ? "No activity matches your date range"
              : category === "all"
                ? "No activity recorded yet"
                : `No ${CATEGORY_TABS.find((t) => t.key === category)?.label.toLowerCase()} activity yet`
            }
          </p>
          {hasDateFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDateFrom(undefined); setDateTo(undefined) }}
            >
              Clear dates
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-1">
                {group.entries.map((entry) => (
                  <HistoryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-1.5"
              >
                {loadingMore ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const config = ACTIVITY_TYPE_CONFIG[entry.activityType]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-muted/30">
      {/* Icon */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Badge variant="outline" className="text-[10px] font-normal">
            {config.label}
          </Badge>
          <span className="text-[13px] font-medium">{entry.title}</span>
          <span className="text-[11px] text-muted-foreground">
            {format(parseISO(entry.createdAt), "h:mm a")}
          </span>
        </div>
        {entry.details && (
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {formatDetails(entry)}
          </p>
        )}
      </div>

      {/* Lead link */}
      <Link
        href={`/leads/${entry.leadId}`}
        className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[12px] font-medium text-[#1773cf] transition-colors hover:bg-[#eff6ff] dark:hover:bg-[#1773cf]/15"
      >
        {entry.leadName}
      </Link>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Detail formatting                                                  */
/* ------------------------------------------------------------------ */

function formatDetails(entry: HistoryEntry): string {
  const d = entry.details
  if (!d) return ""

  switch (entry.activityType) {
    case "call":
      return [
        d.direction === "inbound" ? "Inbound" : "Outbound",
        typeof d.duration_seconds === "number"
          ? `${Math.floor(d.duration_seconds / 60)}m ${d.duration_seconds % 60}s`
          : null,
        typeof d.outcome === "string" ? d.outcome : null,
      ].filter(Boolean).join(" - ")

    case "quote":
      return [
        typeof d.coverage === "string" ? d.coverage : null,
        typeof d.term === "string" ? d.term : null,
        typeof d.top_carrier === "string" ? `Top: ${d.top_carrier}` : null,
      ].filter(Boolean).join(" / ")

    case "sms_sent":
    case "sms_received":
      return typeof d.message_preview === "string" ? d.message_preview : ""

    case "email_sent":
      return typeof d.subject === "string" ? d.subject : ""

    case "status_change":
      return typeof d.from === "string" && typeof d.to === "string"
        ? `${d.from} → ${d.to}`
        : ""

    case "enrichment":
      return Array.isArray(d.fields_updated)
        ? `${d.fields_updated.length} fields updated`
        : ""

    case "note":
      return typeof d.text === "string" ? d.text : ""

    default:
      return ""
  }
}
