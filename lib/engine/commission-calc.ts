import type { CommissionEstimate } from "@/lib/types/commission"

export function calculateCommission(
  annualPremium: number,
  firstYearPercent: number,
  renewalPercent: number,
): CommissionEstimate {
  if (!annualPremium || annualPremium <= 0) {
    return { firstYear: 0, renewal: 0, fiveYearTotal: 0 }
  }

  const safeFirstYear = Math.max(0, firstYearPercent ?? 0)
  const safeRenewal = Math.max(0, renewalPercent ?? 0)

  const firstYear = annualPremium * (safeFirstYear / 100)
  const renewal = annualPremium * (safeRenewal / 100)
  const fiveYearTotal = firstYear + renewal * 4

  return { firstYear, renewal, fiveYearTotal }
}
