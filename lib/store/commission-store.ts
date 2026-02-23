import { create } from "zustand"
import { CARRIERS } from "@/lib/data/carriers"
import type { CarrierCommission, CommissionSettings } from "@/lib/types/commission"

/* ------------------------------------------------------------------ */
/*  State + Actions                                                    */
/* ------------------------------------------------------------------ */

interface CommissionState {
  commissions: CarrierCommission[]
  defaultFirstYearPercent: number
  defaultRenewalPercent: number
  isLoaded: boolean
  isSaving: boolean
  saveError: string | null
}

interface CommissionActions {
  setCarrierCommission: (
    carrierId: string,
    firstYearPercent: number,
    renewalPercent: number,
  ) => void
  removeCarrierCommission: (carrierId: string) => void
  removeAllCarrierCommissions: () => void
  bulkSetFirstYear: (carrierIds: readonly string[], percent: number) => void
  bulkSetRenewal: (carrierIds: readonly string[], percent: number) => void
  getCommissionRates: (carrierId: string) => {
    firstYearPercent: number
    renewalPercent: number
    isCustom: boolean
  }
  setDefaults: (firstYearPercent: number, renewalPercent: number) => void
  loadFromServer: () => Promise<void>
  saveToServer: () => void
}

/* ------------------------------------------------------------------ */
/*  Initial state                                                      */
/* ------------------------------------------------------------------ */

const initialCommissions: CarrierCommission[] = CARRIERS.map((c) => ({
  carrierId: c.id,
  carrierName: c.name,
  firstYearPercent: 0,
  renewalPercent: 0,
}))

/* ------------------------------------------------------------------ */
/*  Debounced save helper                                              */
/* ------------------------------------------------------------------ */

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave(getState: () => CommissionState & CommissionActions) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const state = getState()
    const payload: CommissionSettings = {
      defaultFirstYearPercent: state.defaultFirstYearPercent,
      defaultRenewalPercent: state.defaultRenewalPercent,
      commissions: state.commissions.filter(
        (c) => c.firstYearPercent > 0 || c.renewalPercent > 0
      ),
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
    } catch {
      // Non-blocking — surface error in UI via store
    }
  }, 1000)
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

export const useCommissionStore = create<CommissionState & CommissionActions>()(
  (set, get) => ({
    commissions: initialCommissions,
    defaultFirstYearPercent: 75,
    defaultRenewalPercent: 5,
    isLoaded: false,
    isSaving: false,
    saveError: null,

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
      debouncedSave(get)
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
      debouncedSave(get)
    },

    removeAllCarrierCommissions: () => {
      const { commissions } = get()
      set({
        commissions: commissions.map((c) => ({
          ...c,
          firstYearPercent: 0,
          renewalPercent: 0,
        })),
      })
      debouncedSave(get)
    },

    bulkSetFirstYear: (carrierIds, percent) => {
      const { commissions, defaultRenewalPercent } = get()
      const idSet = new Set(carrierIds)
      set({
        commissions: commissions.map((c) => {
          if (!idSet.has(c.carrierId)) return c
          const hasCustomRn = c.renewalPercent > 0
          return {
            ...c,
            firstYearPercent: percent,
            renewalPercent: hasCustomRn ? c.renewalPercent : defaultRenewalPercent,
          }
        }),
      })
      debouncedSave(get)
    },

    bulkSetRenewal: (carrierIds, percent) => {
      const { commissions, defaultFirstYearPercent } = get()
      const idSet = new Set(carrierIds)
      set({
        commissions: commissions.map((c) => {
          if (!idSet.has(c.carrierId)) return c
          const hasCustomFy = c.firstYearPercent > 0
          return {
            ...c,
            firstYearPercent: hasCustomFy ? c.firstYearPercent : defaultFirstYearPercent,
            renewalPercent: percent,
          }
        }),
      })
      debouncedSave(get)
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
      debouncedSave(get)
    },

    loadFromServer: async () => {
      try {
        const res = await fetch("/api/settings")
        if (!res.ok) throw new Error("Failed to fetch settings")

        const serverSettings: CommissionSettings = await res.json()

        if (serverSettings.commissions?.length > 0) {
          // Server has data — merge with full carrier list
          const merged = initialCommissions.map((ic) => {
            const override = serverSettings.commissions.find(
              (sc) => sc.carrierId === ic.carrierId
            )
            return override ? { ...ic, ...override } : ic
          })

          set({
            commissions: merged,
            defaultFirstYearPercent: serverSettings.defaultFirstYearPercent,
            defaultRenewalPercent: serverSettings.defaultRenewalPercent,
            isLoaded: true,
          })
        } else {
          // No server data — check localStorage for migration
          try {
            const localData = localStorage.getItem("ensurance-commission-settings")
            if (localData) {
              const parsed = JSON.parse(localData)
              const localState = parsed.state as CommissionState | undefined

              if (localState?.commissions) {
                const merged = initialCommissions.map((ic) => {
                  const override = localState.commissions.find(
                    (sc) => sc.carrierId === ic.carrierId
                  )
                  return override ? { ...ic, ...override } : ic
                })

                set({
                  commissions: merged,
                  defaultFirstYearPercent:
                    localState.defaultFirstYearPercent ?? 75,
                  defaultRenewalPercent:
                    localState.defaultRenewalPercent ?? 5,
                  isLoaded: true,
                })

                // Migrate to server, then clean up localStorage
                debouncedSave(get)
                localStorage.removeItem("ensurance-commission-settings")
                return
              }
            }
          } catch {
            // Ignore corrupt localStorage
          }

          // No server data, no localStorage — use defaults
          set({ isLoaded: true })
        }
      } catch {
        // Network error — use defaults, allow offline usage
        set({ isLoaded: true })
      }
    },

    saveToServer: () => {
      debouncedSave(get)
    },
  }),
)
