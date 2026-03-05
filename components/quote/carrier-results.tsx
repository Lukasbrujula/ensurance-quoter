"use client"

import { useState, useMemo, useCallback } from "react"
import { RefreshCw, Filter, ChevronRight, ChevronDown, Star, HeartPulse, CheckCircle2, Copy, Check, Search, AlertCircle, Mail, Pill, FileText, ShieldAlert, Info } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmptyState } from "@/components/shared/empty-state"
import { useLeadStore } from "@/lib/store/lead-store"
import { useCommissionStore } from "@/lib/store/commission-store"
import { calculateCommission } from "@/lib/engine/commission-calc"
import type { CarrierQuote } from "@/lib/types"
import { buildQuoteSummary } from "@/lib/utils/quote-summary"
import { CarrierLogo } from "@/components/quote/carrier-logo"
import { ShareQuoteDialog } from "@/components/quote/share-quote-dialog"
import { ProposalDialog } from "@/components/quote/proposal-dialog"

type SortField = "matchScore" | "monthlyPremium" | "annualPremium" | "amBest" | "commission"

const EMPTY_QUOTES: CarrierQuote[] = []

interface CarrierResultsProps {
  onViewDetails?: (quote: CarrierQuote) => void
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function RatingBadge({ rating, label }: { rating: string; label: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-[#bfdbfe] bg-[#dbeafe] px-2 py-0.5 text-[10px] font-medium text-[#1773cf] dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
      {rating} {label}
    </span>
  )
}

function FeaturePill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] text-muted-foreground">
      {text}
    </span>
  )
}

function ScrollableTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-background">
      <div className="min-w-[820px]">{children}</div>
    </div>
  )
}

function hasLivingBenefits(value: string): boolean {
  return value !== "None specified" && value.length > 0
}

const GRID_COLS = "grid-cols-[minmax(260px,1.4fr)_minmax(120px,1fr)_90px_100px_90px_90px_110px_40px]"

function ColumnHeaders() {
  return (
    <div className={`grid ${GRID_COLS} border-b border-border bg-muted`}>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Carrier
        </span>
      </div>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Product Name
        </span>
      </div>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Rating
        </span>
      </div>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Est. Monthly
        </span>
      </div>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Est. Annual
        </span>
      </div>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Commission
        </span>
      </div>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Actions
        </span>
      </div>
      <div className="py-2.5" />
    </div>
  )
}

function CarrierRow({
  quote,
  isSelected,
  onToggleSelection,
  onViewDetails,
  compact = false,
  commissionFirstYear,
  commissionRateLabel,
  isHighestCommission = false,
}: {
  quote: CarrierQuote
  isSelected: boolean
  onToggleSelection: (carrierId: string) => void
  onViewDetails?: (quote: CarrierQuote) => void
  compact?: boolean
  commissionFirstYear: number
  commissionRateLabel: string
  isHighestCommission?: boolean
}) {
  const hasMedicationFlags =
    quote.medicationFlags && quote.medicationFlags.length > 0
  const hasUnderwritingWarnings =
    quote.underwritingWarnings && quote.underwritingWarnings.length > 0
  const hasFeatureLine =
    quote.features.length > 0 || quote.carrier.tobacco.keyNote

  return (
    <div
      onClick={() => onViewDetails?.(quote)}
      className={`cursor-pointer border-b border-border bg-background last:border-b-0 hover:bg-muted ${
        quote.isBestValue
          ? "border-l-4 border-l-[#16a34a]"
          : ""
      }`}
    >
      {/* Line 1 — Data columns */}
      <div className={`grid ${GRID_COLS} items-center ${compact ? "py-3" : "py-4"}`}>
        {/* Carrier */}
        <div className="flex items-center gap-2.5 px-4">
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(quote.carrier.id)}
            />
          </div>
          <CarrierLogo carrier={quote.carrier} />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">
              {quote.carrier.name}
            </span>
            {quote.isBestValue && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-[#fde68a] bg-[#fef9c3] px-1.5 py-px text-[8px] font-black uppercase text-[#b45309] dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Star className="h-2.5 w-2.5 fill-current" />
                Best Value
              </span>
            )}
            {hasMedicationFlags && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 items-center">
                      <Pill className="h-3.5 w-3.5 text-[#f59e0b]" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs">
                    <p className="font-semibold">Medication Flags</p>
                    {quote.medicationFlags!.map((f) => (
                      <p key={`${f.medication}-${f.action}`}>
                        <span className={f.action === "decline" ? "text-red-500 font-medium" : "text-amber-500 font-medium"}>
                          {f.action === "decline" ? "Decline" : "Conditional"}
                        </span>
                        : {f.medication} ({f.condition}){f.detail ? ` — ${f.detail}` : ""}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {hasUnderwritingWarnings && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 items-center">
                      <ShieldAlert className="h-3.5 w-3.5 text-[#dc2626]" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px] text-xs">
                    <p className="font-semibold">Underwriting Warnings</p>
                    {quote.underwritingWarnings!.map((w) => (
                      <p key={`${w.type}-${w.label}`}>
                        <span className={w.type === "rx_decline" || w.type === "combo_decline" ? "text-red-500 font-medium" : "text-amber-500 font-medium"}>
                          {w.type === "rx_decline" ? "Rx Decline" : w.type === "rx_graded" ? "Graded Eligible" : w.type === "rx_review" ? "Rx Review" : "Combo Decline"}
                        </span>
                        : {w.label}{w.detail ? ` — ${w.detail}` : ""}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {hasLivingBenefits(quote.carrier.livingBenefits) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 items-center">
                      <HeartPulse className="h-3.5 w-3.5 text-[#e11d48]" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    <p className="font-semibold">Living Benefits</p>
                    <p>{quote.carrier.livingBenefits}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Product Name */}
        <div className="px-4">
          <span className="text-[12px] text-muted-foreground">
            {quote.product.name}
          </span>
        </div>

        {/* Rating */}
        <div className="px-4">
          <RatingBadge
            rating={quote.carrier.amBest}
            label={quote.carrier.amBestLabel}
          />
        </div>

        {/* Monthly */}
        <div className="px-4">
          <span
            className={`text-[14px] font-bold tabular-nums ${
              quote.isBestValue ? "text-[#16a34a]" : "text-foreground"
            }`}
          >
            {formatCurrency(quote.monthlyPremium)}
          </span>
          {quote.pricingSource === "mock" && (
            <span className="ml-1 inline-flex items-center rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Est.
            </span>
          )}
        </div>

        {/* Annual */}
        <div className="px-4">
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {formatCurrency(quote.annualPremium)}
          </span>
        </div>

        {/* Commission */}
        <div className="px-4">
          {commissionFirstYear > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-default">
                    <span
                      className={`text-[13px] font-bold tabular-nums ${
                        isHighestCommission ? "text-[#16a34a]" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(commissionFirstYear)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground/70">
                      {commissionRateLabel}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  First year commission estimate
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-[11px] text-muted-foreground/70">
              Set rates in Settings
            </span>
          )}
        </div>

        {/* Actions — APPLY NOW */}
        <div className="px-4">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails?.(quote)
            }}
            className={`inline-flex items-center rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
              quote.isBestValue
                ? "bg-[#1773cf] text-white shadow-[0px_2px_4px_0px_rgba(23,115,207,0.2)] hover:bg-[#1566b8]"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            View Details
          </button>
        </div>

        {/* Expand arrow */}
        <div className="pr-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onViewDetails?.(quote)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-sm border border-border text-muted-foreground/70 transition-colors hover:border-[#1773cf] hover:text-[#1773cf]"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Line 2 — Key differentiator + feature pills */}
      {(hasFeatureLine || hasMedicationFlags || hasUnderwritingWarnings) && (
        <div className="flex flex-wrap items-center gap-2 overflow-hidden border-t border-border px-4 pb-4 pt-2.5 pl-[70px]">
          {hasUnderwritingWarnings && quote.underwritingWarnings!.map((w) => (
            <span
              key={`${w.type}-${w.label}`}
              className={`inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium ${
                w.type === "rx_decline" || w.type === "combo_decline"
                  ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                  : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              <ShieldAlert className="h-3 w-3" />
              {w.type === "rx_decline" ? "Rx Decline" : w.type === "rx_graded" ? "Graded Eligible" : w.type === "rx_review" ? "Rx Review" : "Combo Decline"}: {w.label}
            </span>
          ))}
          {hasMedicationFlags && quote.medicationFlags!.map((f) => (
            <span
              key={`${f.medication}-${f.action}`}
              className={`inline-flex max-w-full items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-medium ${
                f.action === "decline"
                  ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                  : "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              <Pill className="h-3 w-3" />
              {f.action === "decline" ? "Rx Decline" : "Rx Review"}: {f.medication}
            </span>
          ))}
          {quote.carrier.tobacco.keyNote && (
            <span className="inline-flex max-w-full items-center rounded-sm border border-[#fde68a] bg-[#fef9c3] px-2 py-0.5 text-[10px] font-medium text-[#92400e] dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
              {quote.carrier.tobacco.keyNote}
            </span>
          )}
          {(() => {
            const filtered = quote.features.filter(
              (f) => f !== quote.carrier.tobacco.keyNote,
            )
            const visible = filtered.slice(0, 2)
            const remaining = filtered.length - visible.length
            return (
              <>
                {visible.map((feature) => (
                  <FeaturePill key={feature} text={feature} />
                ))}
                {remaining > 0 && (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    +{remaining} more
                  </span>
                )}
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export function CarrierResults({
  onViewDetails,
}: CarrierResultsProps) {
  const quotes = useLeadStore((s) => s.quoteResponse?.quotes ?? EMPTY_QUOTES)
  const hasQuoteResponse = useLeadStore((s) => s.quoteResponse !== null)
  const isLoading = useLeadStore((s) => s.isQuoteLoading)
  const selectedCarrierIds = useLeadStore((s) => s.selectedCarrierIds)
  const intakeData = useLeadStore((s) => s.intakeData)
  const fetchQuotes = useLeadStore((s) => s.fetchQuotes)
  const toggleCarrierSelection = useLeadStore((s) => s.toggleCarrierSelection)
  const getCommissionRates = useCommissionStore((s) => s.getCommissionRates)
  const activeLead = useLeadStore((s) => s.activeLead)
  const hasActiveLead = activeLead !== null

  const [sortField, setSortField] = useState<SortField>("matchScore")
  const [othersOpen, setOthersOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)

  const commissionMap = useMemo(() => {
    const map = new Map<string, { firstYear: number; label: string }>()
    for (const q of quotes) {
      if (!q.isEligible) continue
      const rates = getCommissionRates(q.carrier.id)
      const estimate = calculateCommission(
        q.annualPremium,
        rates.firstYearPercent,
        rates.renewalPercent,
      )
      map.set(q.carrier.id, {
        firstYear: estimate.firstYear,
        label: `${rates.firstYearPercent}% FY / ${rates.renewalPercent}% RN`,
      })
    }
    return map
  }, [quotes, getCommissionRates])

  const highestCommissionId = useMemo(() => {
    let maxId = ""
    let maxVal = 0
    for (const [carrierId, data] of commissionMap) {
      if (data.firstYear > maxVal) {
        maxVal = data.firstYear
        maxId = carrierId
      }
    }
    return maxVal > 0 ? maxId : ""
  }, [commissionMap])

  const eligibleQuotes = useMemo(() => {
    const filtered = quotes.filter((q) => q.isEligible)
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "matchScore":
          return b.matchScore - a.matchScore
        case "monthlyPremium":
          return a.monthlyPremium - b.monthlyPremium
        case "annualPremium":
          return a.annualPremium - b.annualPremium
        case "amBest":
          return b.carrier.amBest.localeCompare(a.carrier.amBest)
        case "commission": {
          const aComm = commissionMap.get(a.carrier.id)?.firstYear ?? 0
          const bComm = commissionMap.get(b.carrier.id)?.firstYear ?? 0
          return bComm - aComm
        }
        default:
          return 0
      }
    })
  }, [quotes, sortField, commissionMap])

  const bestMatches = eligibleQuotes.slice(0, 3)
  const allCarriers = eligibleQuotes.slice(3)

  const handleCopySummary = useCallback(async () => {
    if (!intakeData || bestMatches.length === 0) return
    const summary = buildQuoteSummary(intakeData, bestMatches)
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      toast.success("Quote summary copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy — try again")
    }
  }, [intakeData, bestMatches])

  return (
    <div>
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-[1.2px] text-foreground">
          Market Comparison
        </h3>
        <div className="flex items-center gap-4">
          {/* Saved indicator — quotes auto-save when a lead is active */}
          {hasActiveLead && eligibleQuotes.length > 0 && !isLoading && (
            <span className="flex items-center gap-1 text-[#16a34a]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase">Saved to Lead</span>
            </span>
          )}
          {eligibleQuotes.length > 0 && !isLoading && (
            <>
              {activeLead && (activeLead.email || activeLead.phone) && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1773cf]"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">
                    Share Quote
                  </span>
                </button>
              )}
              {hasActiveLead && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1773cf]"
                  onClick={() => {
                    if (selectedCarrierIds.size < 2) {
                      toast.info("Select at least 2 carriers to generate a proposal")
                      return
                    }
                    setProposalOpen(true)
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">
                    Proposal
                  </span>
                </button>
              )}
              <button
                type="button"
                className="flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1773cf]"
                onClick={handleCopySummary}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#16a34a]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span className="text-[10px] font-bold uppercase">
                  {copied ? "Copied" : "Copy Summary"}
                </span>
              </button>
            </>
          )}
          <button
            type="button"
            className="flex items-center gap-1 text-[#1773cf] hover:text-[#1566b8]"
            onClick={() => { if (intakeData) fetchQuotes(intakeData) }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="text-[10px] font-bold uppercase">Refresh Rates</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1.5 text-muted-foreground hover:bg-muted"
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase">Filter</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {eligibleQuotes.length === 0 && !isLoading && (
        hasQuoteResponse ? (
          <EmptyState
            compact
            icon={<AlertCircle className="text-muted-foreground" />}
            title="No carriers available"
            description="Try adjusting coverage or term length."
          />
        ) : (
          <EmptyState
            compact
            icon={<Search className="text-muted-foreground" />}
            title="Ready to find the best match"
            description="Fill out client details on the left."
          />
        )
      )}

      {/* Estimate disclaimer */}
      {eligibleQuotes.length > 0 && !isLoading && (
        <div className="mb-4 flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50/60 px-3.5 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              Estimates Only — Not a Binding Quote
            </p>
            <p className="text-[11px] leading-relaxed text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              Actual premiums are determined at application and are subject to underwriting approval.
              Rates shown are illustrative based on the information provided.
            </p>
          </div>
        </div>
      )}

      {/* Best Matches */}
      {bestMatches.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
              Best Matches
            </h4>
            <span className="text-[11px] text-muted-foreground/70">
              Top carriers for this profile
            </span>
          </div>
          <ScrollableTable>
            <ColumnHeaders />
            {bestMatches.map((quote) => {
              const comm = commissionMap.get(quote.carrier.id)
              return (
                <CarrierRow
                  key={quote.carrier.id}
                  quote={quote}
                  isSelected={selectedCarrierIds.has(quote.carrier.id)}
                  onToggleSelection={toggleCarrierSelection}
                  onViewDetails={onViewDetails}
                  commissionFirstYear={comm?.firstYear ?? 0}
                  commissionRateLabel={comm?.label ?? ""}
                  isHighestCommission={quote.carrier.id === highestCommissionId}
                />
              )
            })}
          </ScrollableTable>
        </div>
      )}

      {/* Other Carriers — collapsible */}
      {allCarriers.length > 0 && (
        <Collapsible open={othersOpen} onOpenChange={setOthersOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-[12px] text-muted-foreground transition-colors hover:text-[#1773cf]"
            >
              <div className="h-px flex-1 bg-border" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${othersOpen ? "rotate-180" : ""}`}
                />
                {othersOpen
                  ? "Hide other carriers"
                  : `Show ${allCarriers.length} more carrier${allCarriers.length === 1 ? "" : "s"}`}
              </span>
              <div className="h-px flex-1 bg-border" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-2">
              <ScrollableTable>
                <ColumnHeaders />
                {allCarriers.map((quote) => {
                  const comm = commissionMap.get(quote.carrier.id)
                  return (
                    <CarrierRow
                      key={quote.carrier.id}
                      quote={quote}
                      isSelected={selectedCarrierIds.has(quote.carrier.id)}
                      onToggleSelection={toggleCarrierSelection}
                      onViewDetails={onViewDetails}
                      compact
                      commissionFirstYear={comm?.firstYear ?? 0}
                      commissionRateLabel={comm?.label ?? ""}
                      isHighestCommission={quote.carrier.id === highestCommissionId}
                    />
                  )
                })}
              </ScrollableTable>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Footer disclaimer */}
      {eligibleQuotes.length > 0 && !isLoading && (
        <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground/70">
          Ensurance provides estimated quotes for informational purposes only. This is not a contract or guarantee of coverage.
        </p>
      )}

      {/* Share Quote Dialog (Email + SMS) */}
      {activeLead && intakeData && (
        <ShareQuoteDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          leadId={activeLead.id}
          leadName={
            [activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ") ||
            intakeData.name
          }
          leadEmail={activeLead.email}
          leadPhone={activeLead.phone}
          coverageAmount={intakeData.coverageAmount}
          termLength={intakeData.termLength}
          topCarriers={bestMatches}
          intakeData={intakeData}
        />
      )}

      {/* Proposal PDF Dialog */}
      {activeLead && intakeData && selectedCarrierIds.size >= 2 && (
        <ProposalDialog
          open={proposalOpen}
          onOpenChange={setProposalOpen}
          leadId={activeLead.id}
          clientName={
            [activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ") ||
            intakeData.name
          }
          coverageAmount={intakeData.coverageAmount}
          termLength={intakeData.termLength}
          carrierIds={eligibleQuotes
            .filter((q) => selectedCarrierIds.has(q.carrier.id))
            .map((q) => q.carrier.id)}
          carrierNames={eligibleQuotes
            .filter((q) => selectedCarrierIds.has(q.carrier.id))
            .map((q) => q.carrier.name)}
        />
      )}
    </div>
  )
}
