"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Users,
  Loader2,
  AlertCircle,
  Phone,
  CalendarClock,
  Zap,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { useLeadStore } from "@/lib/store/lead-store"
import { EmptyState } from "@/components/shared/empty-state"
import { CSVUpload } from "./csv-upload"
import { AddLeadDialog } from "./add-lead-dialog"
import { LeadStatusBadge, LEAD_STATUSES, getStatusLabel } from "./lead-status-badge"
import {
  FollowUpScheduler,
  FollowUpIndicator,
  getFollowUpUrgency,
} from "./follow-up-scheduler"
import { updateLeadFields } from "@/lib/actions/leads"
import { toast } from "sonner"
import { PreScreenBadge } from "./pre-screen-badge"
import { LeadInfoPanel } from "./lead-info-panel"
import type { Lead, LeadStatus } from "@/lib/types/lead"
import type { LeadSource } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Sort                                                                */
/* ------------------------------------------------------------------ */

type SortKey = "name" | "status" | "email" | "state" | "source" | "followUp" | "createdAt"
type SortDir = "asc" | "desc"

const STATUS_ORDER: Record<LeadStatus, number> = {
  new: 0,
  contacted: 1,
  quoted: 2,
  applied: 3,
  issued: 4,
  dead: 5,
}

function getLeadName(lead: Lead): string {
  const parts = [lead.firstName, lead.lastName].filter(Boolean)
  return parts.join(" ") || "—"
}

function compareFn(a: Lead, b: Lead, key: SortKey, dir: SortDir): number {
  let cmp = 0
  switch (key) {
    case "name":
      cmp = getLeadName(a).localeCompare(getLeadName(b))
      break
    case "status":
      cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      break
    case "email":
      cmp = (a.email ?? "").localeCompare(b.email ?? "")
      break
    case "state":
      cmp = (a.state ?? "").localeCompare(b.state ?? "")
      break
    case "source":
      cmp = a.source.localeCompare(b.source)
      break
    case "followUp": {
      // Sort: overdue first, then today, then upcoming, then no follow-up
      const urgencyOrder = { overdue: 0, today: 1, upcoming: 2, none: 3 }
      const aU = urgencyOrder[getFollowUpUrgency(a.followUpDate)]
      const bU = urgencyOrder[getFollowUpUrgency(b.followUpDate)]
      cmp = aU - bU
      if (cmp === 0) {
        cmp = (a.followUpDate ?? "z").localeCompare(b.followUpDate ?? "z")
      }
      break
    }
    case "createdAt":
      cmp = a.createdAt.localeCompare(b.createdAt)
      break
  }
  return dir === "asc" ? cmp : -cmp
}

/* ------------------------------------------------------------------ */
/*  Source badge                                                        */
/* ------------------------------------------------------------------ */

const SOURCE_STYLES: Record<LeadSource, string> = {
  csv: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  ringba: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  manual: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  api: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  ai_agent: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  csv: "CSV",
  ringba: "RINGBA",
  manual: "MANUAL",
  api: "API",
  ai_agent: "AI",
}

function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <Badge variant="secondary" className={SOURCE_STYLES[source]}>
      {SOURCE_LABELS[source]}
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/*  Status icon                                                        */
/* ------------------------------------------------------------------ */

function StatusIcon({ active }: { active: boolean }) {
  return active ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-muted-foreground/40" />
  )
}

/* ------------------------------------------------------------------ */
/*  Sort header                                                        */
/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onClick,
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  currentDir: SortDir
  onClick: (key: SortKey) => void
}) {
  const isActive = currentKey === sortKey
  return (
    <TableHead
      className="cursor-pointer select-none whitespace-nowrap"
      onClick={() => onClick(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
        )}
      </span>
    </TableHead>
  )
}

/* ------------------------------------------------------------------ */
/*  Status filter pills                                                */
/* ------------------------------------------------------------------ */

function StatusFilterPills({
  selected,
  onChange,
}: {
  selected: Set<LeadStatus>
  onChange: (statuses: Set<LeadStatus>) => void
}) {
  function toggle(status: LeadStatus) {
    const next = new Set(selected)
    if (next.has(status)) {
      next.delete(status)
    } else {
      next.add(status)
    }
    onChange(next)
  }

  function selectAll() {
    onChange(new Set(LEAD_STATUSES))
  }

  const allSelected = selected.size === LEAD_STATUSES.length

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button
        type="button"
        onClick={selectAll}
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
          allSelected
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        }`}
      >
        All
      </button>
      {LEAD_STATUSES.map((status) => {
        const isActive = selected.has(status)
        return (
          <button
            key={status}
            type="button"
            onClick={() => toggle(status)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
              isActive
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {getStatusLabel(status)}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Display-only cells (click propagates to row → opens modal)          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Quick-schedule cell (popover in table row)                         */
/* ------------------------------------------------------------------ */

function QuickScheduleCell({
  lead,
  onSaved,
}: {
  lead: Lead
  onSaved: (leadId: string, date: string, note: string | null, smsReminder?: boolean) => void
}) {
  const [open, setOpen] = useState(false)

  const handleSave = useCallback(
    (date: string, note: string | null, smsReminder?: boolean) => {
      onSaved(lead.id, date, note, smsReminder)
      setOpen(false)
    },
    [lead.id, onSaved],
  )

  const handleClear = useCallback(() => {
    onSaved(lead.id, "", null)
    setOpen(false)
  }, [lead.id, onSaved])

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <FollowUpIndicator
        followUpDate={lead.followUpDate}
        followUpNote={lead.followUpNote}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded p-0.5 text-[#94a3b8] opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-[#f1f5f9] hover:text-[#475569]"
            title="Schedule follow-up"
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start" side="left">
          <FollowUpScheduler
            followUpDate={lead.followUpDate}
            followUpNote={lead.followUpNote}
            onSave={handleSave}
            onClear={handleClear}
            compact
            hasPhone={!!lead.phone}
            smsReminder={lead.smsReminder}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Lead List                                                          */
/* ------------------------------------------------------------------ */

export function LeadList() {
  const leads = useLeadStore((s) => s.leads)
  const isLoading = useLeadStore((s) => s.isLoading)
  const lastSaveError = useLeadStore((s) => s.lastSaveError)
  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)
  const setActiveLead = useLeadStore((s) => s.switchToLead)
  const router = useRouter()

  const [callCounts, setCallCounts] = useState<Record<string, number>>({})
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const handleQuickQuote = useCallback(
    (e: React.MouseEvent, lead: Lead) => {
      e.stopPropagation()
      setActiveLead(lead)
      router.push(`/leads/${lead.id}`)
    },
    [setActiveLead, router],
  )

  // Hydrate leads from Supabase on mount
  useEffect(() => {
    void hydrateLeads()
  }, [hydrateLeads])

  // Fetch call counts when leads change
  useEffect(() => {
    if (leads.length === 0) return
    const ids = leads.map((l) => l.id).join(",")
    void fetch(`/api/call-log/counts?leadIds=${ids}`)
      .then((r) => r.json())
      .then((data: { counts?: Record<string, number> }) => {
        if (data.counts) setCallCounts(data.counts)
      })
      .catch(() => {
        // Non-critical — badge just won't show
      })
  }, [leads])

  // Quick-schedule follow-up from leads list
  const handleQuickFollowUp = useCallback(
    async (leadId: string, date: string, note: string | null, smsReminder?: boolean) => {
      const followUpDate = date || null
      const followUpNote = followUpDate ? note : null

      const fields: Partial<Lead> = {
        followUpDate,
        followUpNote,
      }
      if (smsReminder !== undefined) {
        fields.smsReminder = smsReminder
      }

      // Optimistic update in store
      useLeadStore.setState((s) => ({
        leads: s.leads.map((l) =>
          l.id === leadId ? { ...l, ...fields } : l,
        ),
      }))

      const result = await updateLeadFields(leadId, fields)

      if (!result.success) {
        toast.error("Failed to save follow-up")
        void hydrateLeads()
      } else {
        toast.success(followUpDate ? "Follow-up scheduled" : "Follow-up cleared")
      }
    },
    [hydrateLeads],
  )

  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all")
  const [stateFilter, setStateFilter] = useState<string>("all")
  // Default: show all except "dead", unless URL has ?status=
  const [statusFilter, setStatusFilter] = useState<Set<LeadStatus>>(() => {
    if (typeof window !== "undefined") {
      const urlStatus = new URLSearchParams(window.location.search).get("status")
      if (urlStatus && LEAD_STATUSES.includes(urlStatus as LeadStatus)) {
        return new Set<LeadStatus>([urlStatus as LeadStatus])
      }
    }
    return new Set<LeadStatus>(LEAD_STATUSES.filter((s) => s !== "dead"))
  })
  const [followUpOnly, setFollowUpOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>("createdAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  // Unique states for filter dropdown
  const uniqueStates = useMemo(() => {
    const states = leads
      .map((l) => l.state)
      .filter((s): s is string => s !== null)
    return [...new Set(states)].sort()
  }, [leads])

  // Filter + sort
  const filteredLeads = useMemo(() => {
    const query = search.toLowerCase().trim()

    return leads
      .filter((lead) => {
        // Status filter
        if (!statusFilter.has(lead.status)) return false

        // Follow-up filter
        if (followUpOnly && !lead.followUpDate) return false

        // Search across name, email, phone
        if (query) {
          const name = getLeadName(lead).toLowerCase()
          const email = (lead.email ?? "").toLowerCase()
          const phone = (lead.phone ?? "").toLowerCase()
          if (
            !name.includes(query) &&
            !email.includes(query) &&
            !phone.includes(query)
          ) {
            return false
          }
        }

        // Source filter
        if (sourceFilter !== "all" && lead.source !== sourceFilter) return false

        // State filter
        if (stateFilter !== "all" && lead.state !== stateFilter) return false

        return true
      })
      .sort((a, b) => compareFn(a, b, sortKey, sortDir))
  }, [leads, search, sourceFilter, stateFilter, statusFilter, followUpOnly, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function handleRowClick(lead: Lead) {
    setSelectedLead(lead)
  }

  const handleClosePanel = useCallback(() => {
    setSelectedLead(null)
  }, [])

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  /* ── Loading State ────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading leads...</p>
      </div>
    )
  }

  /* ── Error State ─────────────────────────────────────────────── */

  if (lastSaveError && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <AlertCircle className="mb-4 h-8 w-8 text-red-500" />
        <p className="text-sm font-medium text-red-600">{lastSaveError}</p>
        <button
          type="button"
          onClick={() => void hydrateLeads()}
          className="mt-4 rounded-sm bg-[#1773cf] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#1565b8]"
        >
          Retry
        </button>
      </div>
    )
  }

  /* ── Empty State ──────────────────────────────────────────────── */

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="No leads yet"
        description="Add your first client to start quoting."
      >
        <CSVUpload />
        <AddLeadDialog />
      </EmptyState>
    )
  }

  /* ── List ──────────────────────────────────────────────────────── */

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="space-y-4 px-4 pb-2 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <Select
                value={sourceFilter}
                onValueChange={(v) => setSourceFilter(v as LeadSource | "all")}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="ringba">Ringba</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="ai_agent">AI Agent</SelectItem>
                </SelectContent>
              </Select>

              {uniqueStates.length > 0 && (
                <Select
                  value={stateFilter}
                  onValueChange={setStateFilter}
                >
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {uniqueStates.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CSVUpload />
              <AddLeadDialog />
            </div>
          </div>

          {/* Status filter pills + follow-up toggle */}
          <div className="flex items-center gap-3">
            <StatusFilterPills selected={statusFilter} onChange={setStatusFilter} />
            <div className="h-4 w-px bg-border" />
            <button
              type="button"
              onClick={() => setFollowUpOnly((p) => !p)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                followUpOnly
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Follow-Ups
            </button>
          </div>
        </div>

        {/* Content — Table (scrollable) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader
                    label="Name"
                    sortKey="name"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onClick={handleSort}
                  />
                  <SortHeader
                    label="Status"
                    sortKey="status"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onClick={handleSort}
                  />
                  <SortHeader
                    label="Email"
                    sortKey="email"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onClick={handleSort}
                  />
                  <TableHead>Phone</TableHead>
                  <SortHeader
                    label="State"
                    sortKey="state"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onClick={handleSort}
                  />
                  <SortHeader
                    label="Source"
                    sortKey="source"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onClick={handleSort}
                  />
                  <SortHeader
                    label="Follow-Up"
                    sortKey="followUp"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onClick={handleSort}
                  />
                  <TableHead>Pre-Screen</TableHead>
                  <TableHead className="text-center">Enriched</TableHead>
                  <TableHead className="text-center">Quoted</TableHead>
                  <TableHead className="text-center">Calls</TableHead>
                  <TableHead className="w-8" />
                  <SortHeader
                    label="Created"
                    sortKey="createdAt"
                    currentKey={sortKey}
                    currentDir={sortDir}
                    onClick={handleSort}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No leads match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className={`group/row cursor-pointer ${lead.status === "dead" ? "opacity-60" : ""} ${selectedLead?.id === lead.id ? "bg-muted" : ""}`}
                      onClick={() => handleRowClick(lead)}
                    >
                      <TableCell className="font-medium">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="max-w-[180px] text-muted-foreground">
                        {lead.email || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.phone || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className={!lead.state ? "text-muted-foreground" : ""}>
                          {lead.state ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <SourceBadge source={lead.source} />
                      </TableCell>
                      <TableCell>
                        <QuickScheduleCell
                          lead={lead}
                          onSaved={handleQuickFollowUp}
                        />
                      </TableCell>
                      <TableCell>
                        <PreScreenBadge preScreen={lead.preScreen} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon active={lead.enrichment !== null} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusIcon active={lead.quoteHistory.length > 0} />
                      </TableCell>
                      <TableCell className="text-center">
                        {(callCounts[lead.id] ?? 0) > 0 ? (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <Phone className="h-3 w-3" />
                            {callCounts[lead.id]}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={(e) => handleQuickQuote(e, lead)}
                          className="rounded p-1 text-[#1773cf] opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-[#eff6ff]"
                          title="Open quote"
                        >
                          <Zap className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(lead.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer count */}
          <p className="py-2 text-xs text-muted-foreground">
            {filteredLeads.length} of {leads.length} leads
          </p>
        </div>
      </div>

      {/* ── Detail sheet: lead info sidebar ──────────────────────────── */}
      <Sheet open={selectedLead !== null} onOpenChange={(open) => { if (!open) handleClosePanel() }}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 [&>button:first-child]:hidden">
          {selectedLead && (
            <LeadInfoPanel
              lead={selectedLead}
              onClose={handleClosePanel}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
