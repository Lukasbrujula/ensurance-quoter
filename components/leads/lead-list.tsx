"use client"

import { useEffect, useMemo, useState } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLeadStore } from "@/lib/store/lead-store"
import { CSVUpload } from "./csv-upload"
import { AddLeadDialog } from "./add-lead-dialog"
import type { Lead } from "@/lib/types/lead"
import type { LeadSource } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Sort                                                                */
/* ------------------------------------------------------------------ */

type SortKey = "name" | "email" | "state" | "source" | "createdAt"
type SortDir = "asc" | "desc"

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
    case "email":
      cmp = (a.email ?? "").localeCompare(b.email ?? "")
      break
    case "state":
      cmp = (a.state ?? "").localeCompare(b.state ?? "")
      break
    case "source":
      cmp = a.source.localeCompare(b.source)
      break
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
}

function SourceBadge({ source }: { source: LeadSource }) {
  return (
    <Badge variant="secondary" className={SOURCE_STYLES[source]}>
      {source.toUpperCase()}
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
/*  Lead List                                                          */
/* ------------------------------------------------------------------ */

export function LeadList() {
  const leads = useLeadStore((s) => s.leads)
  const isLoading = useLeadStore((s) => s.isLoading)
  const lastSaveError = useLeadStore((s) => s.lastSaveError)
  const setActiveLead = useLeadStore((s) => s.setActiveLead)
  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)
  const router = useRouter()

  const [callCounts, setCallCounts] = useState<Record<string, number>>({})

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

  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "all">("all")
  const [stateFilter, setStateFilter] = useState<string>("all")
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
  }, [leads, search, sourceFilter, stateFilter, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  function handleRowClick(lead: Lead) {
    setActiveLead(lead)
    router.push(`/leads/${lead.id}`)
  }

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
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-medium">No leads yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV or add a lead manually to get started.
        </p>
        <div className="mt-6 flex gap-3">
          <CSVUpload />
          <AddLeadDialog />
        </div>
      </div>
    )
  }

  /* ── List ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-4">
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

      {/* Table */}
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
              <TableHead className="text-center">Enriched</TableHead>
              <TableHead className="text-center">Quoted</TableHead>
              <TableHead className="text-center">Calls</TableHead>
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
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  No leads match your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(lead)}
                >
                  <TableCell className="font-medium">
                    {getLeadName(lead)}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground">
                    {lead.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lead.phone ?? "—"}
                  </TableCell>
                  <TableCell>{lead.state ?? "—"}</TableCell>
                  <TableCell>
                    <SourceBadge source={lead.source} />
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
      <p className="text-xs text-muted-foreground">
        {filteredLeads.length} of {leads.length} leads
      </p>
    </div>
  )
}
