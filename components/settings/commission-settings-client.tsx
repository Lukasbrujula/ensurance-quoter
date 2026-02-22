"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCommissionStore } from "@/lib/store/commission-store"
import { CARRIERS } from "@/lib/data/carriers"
import { CommissionTableRow } from "./commission-table-row"

const sortedCarriers = [...CARRIERS].sort((a, b) =>
  a.name.localeCompare(b.name),
)

export function CommissionSettingsClient() {
  const defaultFirstYear = useCommissionStore((s) => s.defaultFirstYearPercent)
  const defaultRenewal = useCommissionStore((s) => s.defaultRenewalPercent)
  const setDefaults = useCommissionStore((s) => s.setDefaults)

  const [localDefaultFY, setLocalDefaultFY] = useState(String(defaultFirstYear))
  const [localDefaultRN, setLocalDefaultRN] = useState(String(defaultRenewal))
  const [hydrated, setHydrated] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) {
      setLocalDefaultFY(String(defaultFirstYear))
      setLocalDefaultRN(String(defaultRenewal))
    }
  }, [hydrated, defaultFirstYear, defaultRenewal])

  const syncDefaults = useCallback(
    (fy: string, rn: string) => {
      const fyNum = Math.min(150, Math.max(0, Number(fy) || 0))
      const rnNum = Math.min(25, Math.max(0, Number(rn) || 0))
      setDefaults(fyNum, rnNum)
    },
    [setDefaults],
  )

  const handleDefaultFYChange = (value: string) => {
    setLocalDefaultFY(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => syncDefaults(value, localDefaultRN),
      300,
    )
  }

  const handleDefaultRNChange = (value: string) => {
    setLocalDefaultRN(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => syncDefaults(localDefaultFY, value),
      300,
    )
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded bg-[#e2e8f0]" />
        <div className="h-40 rounded bg-[#f1f5f9]" />
        <div className="h-96 rounded bg-[#f1f5f9]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-bold text-[#0f172a]">
          Commission Settings
        </h1>
        <p className="mt-1 text-[13px] text-[#64748b]">
          Set your negotiated commission rates per carrier. Rates are used to
          calculate estimated earnings in quote results.
        </p>
      </div>

      {/* Section A: Default Rates */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.5px] text-[#0f172a]">
          Default Commission Rates
        </h2>
        <p className="mt-1 text-[12px] text-[#94a3b8]">
          Applied to carriers without specific rates set below
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <div className="space-y-1.5">
            <label
              htmlFor="default-fy"
              className="text-[12px] font-medium text-[#475569]"
            >
              Default First Year %
            </label>
            <div className="relative w-28">
              <Input
                id="default-fy"
                type="number"
                min={0}
                max={150}
                step={1}
                value={localDefaultFY}
                onChange={(e) => handleDefaultFYChange(e.target.value)}
                className="h-9 pr-6 text-[14px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#94a3b8] pointer-events-none">
                %
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="default-rn"
              className="text-[12px] font-medium text-[#475569]"
            >
              Default Renewal %
            </label>
            <div className="relative w-28">
              <Input
                id="default-rn"
                type="number"
                min={0}
                max={25}
                step={0.5}
                value={localDefaultRN}
                onChange={(e) => handleDefaultRNChange(e.target.value)}
                className="h-9 pr-6 text-[14px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#94a3b8] pointer-events-none">
                %
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Section B: Per-Carrier Table */}
      <div>
        <h2 className="text-[13px] font-bold uppercase tracking-[0.5px] text-[#0f172a]">
          Per-Carrier Commission Rates
        </h2>
        <p className="mt-1 text-[12px] text-[#94a3b8]">
          Override default rates for specific carriers. Empty fields use the
          default rates above.
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-[#e2e8f0]">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f9fafb]">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px]">
                  Carrier
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px] w-20">
                  Rating
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px] w-24">
                  First Year %
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px] w-24">
                  Renewal %
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.5px] w-20">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCarriers.map((carrier) => (
                <CommissionTableRow key={carrier.id} carrier={carrier} />
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="mt-3 text-[11px] text-[#94a3b8]">
          Commission rates are stored locally and not shared. When Compulife
          carriers are added, they&apos;ll use your default rates unless you set
          specific ones.
        </p>
      </div>
    </div>
  )
}
