"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Search, CheckSquare, Square, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useAuth } from "@clerk/nextjs"
import { COMPULIFE_COMPANIES, type CompulifeCompany } from "@/lib/data/compulife-companies"

function getLogoUrl(compCode: string): string {
  return `https://www.compulifeapi.com/images/logosapi/${compCode}-medium.png`
}

/** Group companies by first letter of name. */
function groupByLetter(companies: readonly CompulifeCompany[]): Map<string, CompulifeCompany[]> {
  const groups = new Map<string, CompulifeCompany[]>()
  for (const company of companies) {
    const letter = company.name.charAt(0).toUpperCase()
    const existing = groups.get(letter)
    if (existing) {
      existing.push(company)
    } else {
      groups.set(letter, [company])
    }
  }
  return groups
}

const ALL_CODES = new Set(COMPULIFE_COMPANIES.map((c) => c.compCode))

export function CarriersSettingsClient() {
  const { orgId, orgRole } = useAuth()
  const canEditCarriers = !orgId || orgRole === "org:admin"
  const [selectedCodes, setSelectedCodes] = useState<Set<string> | null>(null) // null = all
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set())
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // Load from server
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/carriers")
        if (!res.ok) throw new Error("Failed to load")
        const data = await res.json() as { selectedCarriers: string[] | null }
        if (data.selectedCarriers) {
          setSelectedCodes(new Set(data.selectedCarriers))
        } else {
          setSelectedCodes(null)
        }
      } catch {
        toast.error("Failed to load carrier settings")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // Save to server (debounced)
  const saveToServer = useCallback((codes: Set<string> | null) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const body = codes === null
          ? { selectedCarriers: null }
          : { selectedCarriers: Array.from(codes) }
        const res = await fetch("/api/settings/carriers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed to save")
        toast.success("Carrier preferences saved")
      } catch {
        toast.error("Failed to save carrier preferences")
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [])

  const isAllSelected = selectedCodes === null
  const selectedCount = isAllSelected ? COMPULIFE_COMPANIES.length : selectedCodes.size

  const isCarrierSelected = useCallback(
    (compCode: string) => isAllSelected || selectedCodes.has(compCode),
    [isAllSelected, selectedCodes],
  )

  const handleToggle = useCallback(
    (compCode: string) => {
      let next: Set<string> | null
      if (isAllSelected) {
        // Switching from "all" → explicit set with this one removed
        const allMinusOne = new Set(ALL_CODES)
        allMinusOne.delete(compCode)
        next = allMinusOne
      } else {
        const updated = new Set(selectedCodes)
        if (updated.has(compCode)) {
          if (updated.size <= 1) {
            toast.error("At least one carrier must be selected")
            return
          }
          updated.delete(compCode)
        } else {
          updated.add(compCode)
          // If all codes are now selected, normalize to null
          if (updated.size === ALL_CODES.size) {
            next = null
            setSelectedCodes(null)
            saveToServer(null)
            return
          }
        }
        next = updated
      }
      setSelectedCodes(next)
      saveToServer(next)
    },
    [isAllSelected, selectedCodes, saveToServer],
  )

  const handleSelectAll = useCallback(() => {
    setSelectedCodes(null)
    saveToServer(null)
  }, [saveToServer])

  const handleDeselectAll = useCallback(() => {
    // Keep first carrier to satisfy min(1) constraint
    const first = COMPULIFE_COMPANIES[0].compCode
    const next = new Set([first])
    setSelectedCodes(next)
    saveToServer(next)
  }, [saveToServer])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return COMPULIFE_COMPANIES
    const q = search.toLowerCase()
    return COMPULIFE_COMPANIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.compCode.toLowerCase().includes(q),
    )
  }, [search])

  const grouped = useMemo(() => groupByLetter(filtered), [filtered])
  const letters = useMemo(() => Array.from(grouped.keys()).sort(), [grouped])

  const handleLogoError = useCallback((compCode: string) => {
    setFailedLogos((prev) => {
      const next = new Set(prev)
      next.add(compCode)
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#64748b]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0f172a]">My Carriers</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Select the carriers you&apos;re appointed with. Only selected carriers appear in quote results.
        </p>
      </div>

      {/* Read-only notice for non-admin org members */}
      {!canEditCarriers && (
        <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Carrier selection is managed by your team admin.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Badge
            variant={isAllSelected ? "default" : "secondary"}
            className="shrink-0"
          >
            {isAllSelected ? "All carriers" : `${selectedCount} of ${COMPULIFE_COMPANIES.length} selected`}
          </Badge>
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-[#64748b]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
        {canEditCarriers && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={isAllSelected}
            className="cursor-pointer"
          >
            <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={!isAllSelected && selectedCount <= 1}
            className="cursor-pointer"
          >
            <Square className="mr-1.5 h-3.5 w-3.5" />
            Deselect All
          </Button>
        </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
        <Input
          placeholder="Search carriers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Carrier Grid */}
      {letters.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#94a3b8]">No carriers match your search.</p>
      ) : (
        <div className="space-y-6">
          {letters.map((letter) => {
            const companies = grouped.get(letter)!
            return (
              <div key={letter}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {companies.map((company) => {
                    const selected = isCarrierSelected(company.compCode)
                    const logoFailed = failedLogos.has(company.compCode)
                    return (
                      <label
                        key={company.compCode}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                          canEditCarriers ? "cursor-pointer" : "cursor-default opacity-80"
                        } ${
                          selected
                            ? "border-[#1773cf]/30 bg-[#eff6ff]"
                            : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                        }`}
                      >
                        {/* Logo */}
                        <div className="flex h-9 w-14 shrink-0 items-center justify-center">
                          {logoFailed ? (
                            <span className="flex h-8 w-8 items-center justify-center rounded bg-[#f1f5f9] text-[10px] font-bold text-[#64748b]">
                              {company.compCode.slice(0, 2)}
                            </span>
                          ) : (
                            <img
                              src={getLogoUrl(company.compCode)}
                              alt=""
                              className="h-9 w-14 object-contain"
                              loading="lazy"
                              onError={() => handleLogoError(company.compCode)}
                            />
                          )}
                        </div>

                        {/* Name */}
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#0f172a]">
                          {company.name}
                        </span>

                        {/* Toggle */}
                        <Switch
                          checked={selected}
                          onCheckedChange={() => handleToggle(company.compCode)}
                          className="shrink-0"
                          disabled={!canEditCarriers}
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
