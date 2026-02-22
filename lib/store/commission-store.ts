import { create } from "zustand"
import { persist } from "zustand/middleware"
import { CARRIERS } from "@/lib/data/carriers"
import type { CarrierCommission } from "@/lib/types/commission"

interface CommissionState {
  commissions: CarrierCommission[]
  defaultFirstYearPercent: number
  defaultRenewalPercent: number
}

interface CommissionActions {
  setCarrierCommission: (
    carrierId: string,
    firstYearPercent: number,
    renewalPercent: number,
  ) => void
  removeCarrierCommission: (carrierId: string) => void
  getCommissionRates: (carrierId: string) => {
    firstYearPercent: number
    renewalPercent: number
    isCustom: boolean
  }
  setDefaults: (firstYearPercent: number, renewalPercent: number) => void
}

const initialCommissions: CarrierCommission[] = CARRIERS.map((c) => ({
  carrierId: c.id,
  carrierName: c.name,
  firstYearPercent: 0,
  renewalPercent: 0,
}))

export const useCommissionStore = create<CommissionState & CommissionActions>()(
  persist(
    (set, get) => ({
      commissions: initialCommissions,
      defaultFirstYearPercent: 75,
      defaultRenewalPercent: 5,

      setCarrierCommission: (carrierId, firstYearPercent, renewalPercent) => {
        const { commissions } = get()
        const exists = commissions.some((c) => c.carrierId === carrierId)

        const updated = exists
          ? commissions.map((c) =>
              c.carrierId === carrierId
                ? { ...c, firstYearPercent, renewalPercent }
                : c,
            )
          : [
              ...commissions,
              {
                carrierId,
                carrierName: carrierId,
                firstYearPercent,
                renewalPercent,
              },
            ]

        set({ commissions: updated })
      },

      removeCarrierCommission: (carrierId) => {
        const { commissions } = get()
        set({
          commissions: commissions.map((c) =>
            c.carrierId === carrierId
              ? { ...c, firstYearPercent: 0, renewalPercent: 0 }
              : c,
          ),
        })
      },

      getCommissionRates: (carrierId) => {
        const { commissions, defaultFirstYearPercent, defaultRenewalPercent } =
          get()
        const carrier = commissions.find((c) => c.carrierId === carrierId)
        const hasCustom =
          carrier !== undefined &&
          (carrier.firstYearPercent > 0 || carrier.renewalPercent > 0)

        return {
          firstYearPercent: hasCustom
            ? carrier.firstYearPercent
            : defaultFirstYearPercent,
          renewalPercent: hasCustom
            ? carrier.renewalPercent
            : defaultRenewalPercent,
          isCustom: hasCustom,
        }
      },

      setDefaults: (firstYearPercent, renewalPercent) => {
        set({
          defaultFirstYearPercent: firstYearPercent,
          defaultRenewalPercent: renewalPercent,
        })
      },
    }),
    {
      name: "ensurance-commission-settings",
      partialize: (state) => ({
        commissions: state.commissions,
        defaultFirstYearPercent: state.defaultFirstYearPercent,
        defaultRenewalPercent: state.defaultRenewalPercent,
      }),
    },
  ),
)
