"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { RotateCcw } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCommissionStore } from "@/lib/store/commission-store"
import type { Carrier } from "@/lib/types"

interface CommissionTableRowProps {
  carrier: Carrier
}

export function CommissionTableRow({ carrier }: CommissionTableRowProps) {
  const { getCommissionRates, setCarrierCommission, removeCarrierCommission } =
    useCommissionStore()
  const { firstYearPercent, renewalPercent, isCustom } = getCommissionRates(
    carrier.id,
  )

  const [localFirstYear, setLocalFirstYear] = useState(
    isCustom ? String(firstYearPercent) : "",
  )
  const [localRenewal, setLocalRenewal] = useState(
    isCustom ? String(renewalPercent) : "",
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const syncToStore = useCallback(
    (fy: string, rn: string) => {
      const fyNum = fy === "" ? 0 : Math.min(150, Math.max(0, Number(fy)))
      const rnNum = rn === "" ? 0 : Math.min(25, Math.max(0, Number(rn)))
      setCarrierCommission(carrier.id, fyNum, rnNum)
    },
    [carrier.id, setCarrierCommission],
  )

  const handleFirstYearChange = (value: string) => {
    setLocalFirstYear(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => syncToStore(value, localRenewal), 300)
  }

  const handleRenewalChange = (value: string) => {
    setLocalRenewal(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => syncToStore(localFirstYear, value),
      300,
    )
  }

  const handleReset = () => {
    setLocalFirstYear("")
    setLocalRenewal("")
    removeCarrierCommission(carrier.id)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const defaultFY = useCommissionStore((s) => s.defaultFirstYearPercent)
  const defaultRN = useCommissionStore((s) => s.defaultRenewalPercent)

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[9px] font-bold text-white"
            style={{ backgroundColor: carrier.color }}
          >
            {carrier.abbr}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-medium text-[#0f172a] truncate">
              {carrier.name}
            </span>
            {isCustom && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 shrink-0"
              >
                Custom
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center rounded-sm border border-[#bfdbfe] bg-[#dbeafe] px-2 py-0.5 text-[10px] font-medium text-[#1773cf]">
          {carrier.amBest}
        </span>
      </TableCell>
      <TableCell>
        <div className="relative w-20">
          <Input
            type="number"
            min={0}
            max={150}
            step={1}
            value={localFirstYear}
            onChange={(e) => handleFirstYearChange(e.target.value)}
            placeholder={String(defaultFY)}
            className="h-8 pr-6 text-[13px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#94a3b8] pointer-events-none">
            %
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="relative w-20">
          <Input
            type="number"
            min={0}
            max={25}
            step={0.5}
            value={localRenewal}
            onChange={(e) => handleRenewalChange(e.target.value)}
            placeholder={String(defaultRN)}
            className="h-8 pr-6 text-[13px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#94a3b8] pointer-events-none">
            %
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={!isCustom}
          className="h-8 px-2 text-[11px] text-[#64748b] hover:text-[#0f172a]"
        >
          <RotateCcw className="mr-1 h-3 w-3" />
          Reset
        </Button>
      </TableCell>
    </TableRow>
  )
}
