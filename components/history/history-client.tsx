"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Phone,
  Zap,
  MessageSquare,
  Mail,
  ArrowRight,
  StickyNote,
  Users,
  History,
  Filter,
  CalendarDays,
  X,
} from "lucide-react"
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import type { ActivityType } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  Activity type display config                                       */
/* ------------------------------------------------------------------ */

interface ActivityTypeConfig {
  label: string
  icon: typeof Phone
  iconColor: string
  iconBg: string
}

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  call: { label: "Call Logged", icon: Phone, iconColor: "text-violet-600", iconBg: "bg-violet-50 dark:bg-violet-950" },
  quote: { label: "Quote Run", icon: Zap, iconColor: "text-amber-600", iconBg: "bg-amber-50 dark:bg-amber-950" },
  sms_sent: { label: "SMS Sent", icon: MessageSquare, iconColor: "text-teal-600", iconBg: "bg-teal-50 dark:bg-teal-950" },
  sms_received: { label: "SMS Received", icon: MessageSquare, iconColor: "text-emerald-600", iconBg: "bg-emerald-50 dark:bg-emerald-950" },
  email_sent: { label: "Email Sent", icon: Mail, iconColor: "text-indigo-600", iconBg: "bg-indigo-50 dark:bg-indigo-950" },
  status_change: { label: "Status Changed", icon: ArrowRight, iconColor: "text-blue-600", iconBg: "bg-blue-50 dark:bg-blue-950" },
  note: { label: "Note Added", icon: StickyNote, iconColor: "text-gray-600", iconBg: "bg-gray-50 dark:bg-gray-950" },
  enrichment: { label: "Enrichment Run", icon: Users, iconColor: "text-cyan-600", iconBg: "bg-cyan-50 dark:bg-cyan-950" },
  lead_created: { label: "Lead Created", icon: Users, iconColor: "text-green-600", iconBg: "bg-green-50 dark:bg-green-950" },
  lead_updated: { label: "Lead Updated", icon: Users, iconColor: "text-slate-600", iconBg: "bg-slate-50 dark:bg-slate-950" },
  follow_up: { label: "Follow-up Set", icon: CalendarDays, iconColor: "text-orange-600", iconBg: "bg-orange-50 dark:bg-orange-950" },
}

/* Filterable types (the 7 the user asked for) */
const FILTERABLE_TYPES: ActivityType[] = [
  "call",
  "quote",
  "sms_sent",
  "email_sent",
  "status_change",
  "note",
  "enrichment",
]

/* ------------------------------------------------------------------ */
/*  History entry — mirrors ActivityLog but with leadName for display   */
/* ------------------------------------------------------------------ */

interface HistoryEntry {
  id: string
  leadId: string
  leadName: string
  activityType: ActivityType
  title: string
  description: string
  details: Record<string, unknown> | null
  createdAt: string
}

/* ------------------------------------------------------------------ */
/*  Mock data — structured to swap in real Supabase data later          */
/* ------------------------------------------------------------------ */

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "h1",
    leadId: "lead-001",
    leadName: "Sarah Johnson",
    activityType: "call",
    title: "Outbound call — 4m 32s",
    description: "Discussed 20-year term options, client interested in Mutual of Omaha",
    details: { direction: "outbound", duration_seconds: 272, outcome: "interested" },
    createdAt: "2026-03-04T14:23:00Z",
  },
  {
    id: "h2",
    leadId: "lead-002",
    leadName: "Michael Chen",
    activityType: "quote",
    title: "Quote run — $500K / 20yr",
    description: "Top carrier: Protective Life at $42.50/mo",
    details: { coverage: "$500,000", term: "20 years", top_carrier: "Protective Life", carrier_count: 12 },
    createdAt: "2026-03-04T13:45:00Z",
  },
  {
    id: "h3",
    leadId: "lead-003",
    leadName: "Emily Rodriguez",
    activityType: "sms_sent",
    title: "SMS sent",
    description: "Hi Emily, just following up on the quote I sent yesterday. Any questions?",
    details: { direction: "outbound", to: "+1-555-0103", message_preview: "Hi Emily, just following up..." },
    createdAt: "2026-03-04T11:15:00Z",
  },
  {
    id: "h4",
    leadId: "lead-001",
    leadName: "Sarah Johnson",
    activityType: "email_sent",
    title: "Quote summary emailed",
    description: "Subject: Your Term Life Insurance Quote — Top 3 Carriers",
    details: { recipient: "sarah.j@email.com", subject: "Your Term Life Insurance Quote — Top 3 Carriers", type: "quote_summary" },
    createdAt: "2026-03-04T10:30:00Z",
  },
  {
    id: "h5",
    leadId: "lead-004",
    leadName: "David Kim",
    activityType: "status_change",
    title: "Status: Contacted → Quoted",
    description: "Moved after completing initial quote review call",
    details: { from: "contacted", to: "quoted" },
    createdAt: "2026-03-04T09:50:00Z",
  },
  {
    id: "h6",
    leadId: "lead-002",
    leadName: "Michael Chen",
    activityType: "note",
    title: "Note added",
    description: "Client prefers no-exam options. Has mild hypertension, controlled with medication.",
    details: { text: "Client prefers no-exam options. Has mild hypertension, controlled with medication." },
    createdAt: "2026-03-03T16:20:00Z",
  },
  {
    id: "h7",
    leadId: "lead-005",
    leadName: "Jessica Williams",
    activityType: "enrichment",
    title: "PDL enrichment completed",
    description: "12 fields updated — income, occupation, address, social profiles",
    details: { fields_updated: ["income", "occupation", "address", "linkedin", "twitter"] },
    createdAt: "2026-03-03T15:00:00Z",
  },
  {
    id: "h8",
    leadId: "lead-003",
    leadName: "Emily Rodriguez",
    activityType: "call",
    title: "Inbound call — 8m 15s",
    description: "Client called back with questions about living benefits riders",
    details: { direction: "inbound", duration_seconds: 495, outcome: "follow_up_scheduled" },
    createdAt: "2026-03-03T14:10:00Z",
  },
  {
    id: "h9",
    leadId: "lead-006",
    leadName: "Robert Martinez",
    activityType: "quote",
    title: "Quote run — $250K / 10yr",
    description: "Top carrier: SBLI at $18.75/mo",
    details: { coverage: "$250,000", term: "10 years", top_carrier: "SBLI", carrier_count: 15 },
    createdAt: "2026-03-03T11:30:00Z",
  },
  {
    id: "h10",
    leadId: "lead-004",
    leadName: "David Kim",
    activityType: "status_change",
    title: "Status: New → Contacted",
    description: "Initial outreach completed via phone",
    details: { from: "new", to: "contacted" },
    createdAt: "2026-03-02T16:45:00Z",
  },
  {
    id: "h11",
    leadId: "lead-007",
    leadName: "Amanda Foster",
    activityType: "email_sent",
    title: "Quote summary emailed",
    description: "Subject: Your Life Insurance Options — Comparison",
    details: { recipient: "amanda.foster@email.com", subject: "Your Life Insurance Options — Comparison", type: "quote_summary" },
    createdAt: "2026-03-02T14:20:00Z",
  },
  {
    id: "h12",
    leadId: "lead-005",
    leadName: "Jessica Williams",
    activityType: "note",
    title: "Note added",
    description: "Spouse also interested in coverage. Schedule joint call next week.",
    details: { text: "Spouse also interested in coverage. Schedule joint call next week." },
    createdAt: "2026-03-02T10:00:00Z",
  },
  {
    id: "h13",
    leadId: "lead-008",
    leadName: "Thomas Wright",
    activityType: "sms_sent",
    title: "SMS sent",
    description: "Hi Thomas, your quote is ready! Check your email for details.",
    details: { direction: "outbound", to: "+1-555-0108", message_preview: "Hi Thomas, your quote is ready!" },
    createdAt: "2026-03-01T17:30:00Z",
  },
  {
    id: "h14",
    leadId: "lead-006",
    leadName: "Robert Martinez",
    activityType: "enrichment",
    title: "PDL enrichment completed",
    description: "8 fields updated — employer, job title, education",
    details: { fields_updated: ["employer", "job_title", "education", "city", "state"] },
    createdAt: "2026-03-01T09:15:00Z",
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HistoryClient() {
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(new Set(FILTERABLE_TYPES))
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [typeFilterOpen, setTypeFilterOpen] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_HISTORY.filter((entry) => {
      if (!selectedTypes.has(entry.activityType)) return false
      if (dateFrom || dateTo) {
        const entryDate = parseISO(entry.createdAt)
        const from = dateFrom ? startOfDay(dateFrom) : new Date(0)
        const to = dateTo ? endOfDay(dateTo) : new Date("2099-12-31")
        if (!isWithinInterval(entryDate, { start: from, end: to })) return false
      }
      return true
    })
  }, [selectedTypes, dateFrom, dateTo])

  const activeFilterCount =
    (selectedTypes.size < FILTERABLE_TYPES.length ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0)

  function toggleType(type: ActivityType) {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  function clearFilters() {
    setSelectedTypes(new Set(FILTERABLE_TYPES))
    setDateFrom(undefined)
    setDateTo(undefined)
  }

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
        <p className="text-sm text-muted-foreground tabular-nums">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Activity type filter */}
        <Popover open={typeFilterOpen} onOpenChange={setTypeFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Activity Type
              {selectedTypes.size < FILTERABLE_TYPES.length && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
                  {selectedTypes.size}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-3">
            <div className="space-y-2">
              {FILTERABLE_TYPES.map((type) => {
                const config = ACTIVITY_TYPE_CONFIG[type]
                return (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedTypes.has(type)}
                      onCheckedChange={() => toggleType(type)}
                    />
                    <config.icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
                    {config.label}
                  </label>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date from */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date to */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Timeline list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <History className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No activity matches your filters
          </p>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
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
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[13px] font-medium">{entry.title}</span>
          <span className="text-[11px] text-muted-foreground">
            {format(parseISO(entry.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {entry.description}
        </p>
      </div>

      {/* Lead link */}
      <Link
        href={`/leads/${entry.leadId}`}
        className="shrink-0 rounded-md px-2 py-1 text-[12px] font-medium text-[#1773cf] transition-colors hover:bg-[#eff6ff] dark:hover:bg-[#1773cf]/15"
      >
        {entry.leadName}
      </Link>
    </div>
  )
}
