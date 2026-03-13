"use client"

import { useRouter } from "next/navigation"
import { DollarSign } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useCommissionStore } from "@/lib/store/commission-store"
import type { DashboardStats } from "@/lib/supabase/dashboard"

/* ------------------------------------------------------------------ */
/*  Conversion rates per stage (rough industry averages)               */
/* ------------------------------------------------------------------ */

const STAGE_RATES: Record<string, { rate: number; label: string }> = {
  quoted: { rate: 0.3, label: "Quoted" },
  applied: { rate: 0.7, label: "Applied" },
  issued: { rate: 1.0, label: "Issued" },
}

/* ------------------------------------------------------------------ */
/*  Average annual premium assumption for estimation                   */
/* ------------------------------------------------------------------ */

const AVG_ANNUAL_PREMIUM = 1200

export function CommissionEstimateWidget({
  byStatus,
}: {
  byStatus: Record<string, number>
}) {
  const router = useRouter()
  const { defaultFirstYearPercent } = useCommissionStore()

  const stageEstimates = Object.entries(STAGE_RATES).map(
    ([stage, { rate, label }]) => {
      const count = byStatus[stage] ?? 0
      const estimate =
        count * rate * AVG_ANNUAL_PREMIUM * (defaultFirstYearPercent / 100)
      return { stage, label, count, estimate }
    },
  )

  const totalEstimate = stageEstimates.reduce((s, e) => s + e.estimate, 0)

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push("/settings/commissions")}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Commission Est.
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              ${Math.round(totalEstimate).toLocaleString()}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {stageEstimates
                .filter((e) => e.count > 0)
                .map((e) => `${e.count} ${e.label.toLowerCase()}`)
                .join(", ") || "No active deals"}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf5]">
            <DollarSign className="h-5 w-5 text-[#059669]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
