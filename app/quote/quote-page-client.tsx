"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Lock, ArrowLeft, ChevronRight } from "lucide-react"
import { QuoteWorkspace } from "@/components/quote/quote-workspace"
import { useLeadStore } from "@/lib/store/lead-store"

type ProductTab = "term" | "finalExpense" | "iul" | "annuities"

const PRODUCT_TABS: ReadonlyArray<{
  id: ProductTab
  label: string
  available: boolean
}> = [
  { id: "finalExpense", label: "FINAL EXPENSE", available: false },
  { id: "term", label: "TERM LIFE", available: true },
  { id: "iul", label: "IUL", available: false },
  { id: "annuities", label: "ANNUITIES", available: false },
]

export function QuotePageClient() {
  const [activeTab, setActiveTab] = useState<ProductTab>("term")
  const [comingSoonDismissed, setComingSoonDismissed] = useState(false)

  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)

  // /quote is anonymous — clear any lead context on mount, but hydrate leads
  // list so the contact carousel arrows in PanelDialer can cycle through them.
  useEffect(() => {
    useLeadStore.getState().setActiveLead(null)
    useLeadStore.getState().clearQuoteSession()
    void hydrateLeads()
  }, [hydrateLeads])

  const handleTabClick = useCallback((tab: typeof PRODUCT_TABS[number]) => {
    if (tab.available) {
      setActiveTab(tab.id)
      setComingSoonDismissed(false)
    } else {
      setActiveTab(tab.id)
      setComingSoonDismissed(false)
    }
  }, [])

  const selectedTab = PRODUCT_TABS.find((t) => t.id === activeTab)!

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f6f7f8]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 border-b border-[#e2e8f0] bg-white px-6 py-2 text-[12px]">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 font-medium text-[#64748b] transition-colors hover:text-[#0f172a]"
        >
          <ArrowLeft className="h-3 w-3" />
          Dashboard
        </Link>
        <ChevronRight className="h-3 w-3 text-[#cbd5e1]" />
        <span className="font-bold text-[#0f172a]">Quick Quote</span>
      </div>

      {/* Product Tabs */}
      <div className="flex items-center border-b border-[#e2e8f0] bg-white px-6">
        {PRODUCT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`flex h-9 items-center gap-1.5 border-b-2 px-4 transition-colors ${
              activeTab === tab.id
                ? "border-[#1773cf] bg-[rgba(23,115,207,0.05)]"
                : "border-transparent hover:bg-[#f9fafb]"
            }`}
          >
            <span
              className={`text-[11px] font-bold ${
                activeTab === tab.id ? "text-[#1773cf]" : "text-[#64748b]"
              }`}
            >
              {tab.label}
            </span>
            {!tab.available && (
              <span className="inline-flex items-center rounded-sm bg-[#f1f5f9] px-1 py-px text-[8px] font-bold uppercase text-[#94a3b8]">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active content */}
      {selectedTab.available ? (
        <QuoteWorkspace />
      ) : (
        <ComingSoonPanel
          productName={selectedTab.label}
          dismissed={comingSoonDismissed}
          onDismiss={() => setComingSoonDismissed(true)}
          onSwitchToTerm={() => setActiveTab("term")}
        />
      )}
    </div>
  )
}

function ComingSoonPanel({
  productName,
  dismissed,
  onDismiss,
  onSwitchToTerm,
}: {
  productName: string
  dismissed: boolean
  onDismiss: () => void
  onSwitchToTerm: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#f6f7f8]">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f5f9]">
          <Lock className="h-6 w-6 text-[#94a3b8]" />
        </div>
        <h2 className="text-[16px] font-bold text-[#0f172a]">
          {productName} Quoting
        </h2>
        <p className="mt-1 text-[13px] text-[#64748b]">
          Coming soon. We&apos;re building carrier data and pricing for{" "}
          {productName.toLowerCase()} products.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onSwitchToTerm}
            className="rounded-sm bg-[#1773cf] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.5px] text-white shadow-[0px_2px_4px_0px_rgba(23,115,207,0.2)] hover:bg-[#1566b8]"
          >
            Quote Term Life
          </button>
        </div>
      </div>
    </div>
  )
}
