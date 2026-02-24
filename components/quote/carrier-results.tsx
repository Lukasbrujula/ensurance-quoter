"use client"

import { useState, useMemo, useCallback } from "react"
import { RefreshCw, Filter, ChevronRight, ChevronDown, Star, HeartPulse, CheckCircle2, Copy, Check, Search, AlertCircle, Mail, Pill } from "lucide-react"
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
import { EmailQuoteDialog } from "@/components/quote/email-quote-dialog"

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
    <span className="inline-flex items-center rounded-sm border border-[#bfdbfe] bg-[#dbeafe] px-2 py-0.5 text-[10px] font-medium text-[#1773cf]">
      {rating} {label}
    </span>
  )
}

function FeaturePill({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] text-[#475569]">
      {text}
    </span>
  )
}

const SCROLL_SHADOW_BG = [
  "linear-gradient(to right, white 30%, rgba(255,255,255,0)) left center / 40px 100% no-repeat local",
  "linear-gradient(to left, white 30%, rgba(255,255,255,0)) right center / 40px 100% no-repeat local",
  "linear-gradient(to right, rgba(0,0,0,0.06), transparent) left center / 14px 100% no-repeat scroll",
  "linear-gradient(to left, rgba(0,0,0,0.06), transparent) right center / 14px 100% no-repeat scroll",
].join(", ")

function ScrollableTable({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-x-auto rounded-sm border border-border"
      style={{ background: SCROLL_SHADOW_BG }}
    >
      <div className="min-w-[820px]">{children}</div>
    </div>
  )
}

function hasLivingBenefits(value: string): boolean {
  return value !== "None specified" && value.length > 0
}

const GRID_COLS = "grid-cols-[minmax(180px,1.2fr)_minmax(120px,1fr)_90px_100px_90px_90px_110px_40px]"

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
          Monthly
        </span>
      </div>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Annual
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
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold text-white"
            style={{ backgroundColor: quote.carrier.color }}
          >
            {quote.carrier.abbr}
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-semibold text-foreground truncate">
              {quote.carrier.name}
            </span>
            {quote.isBestValue && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-[#fde68a] bg-[#fef9c3] px-1.5 py-px text-[8px] font-black uppercase text-[#b45309]">
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
          <span className="text-[12px] text-[#475569]">
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
      {(hasFeatureLine || hasMedicationFlags) && (
        <div className="flex flex-wrap items-center gap-2 overflow-hidden border-t border-border px-4 pb-4 pt-2.5 pl-[70px]">
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
            <span className="inline-flex max-w-full items-center rounded-sm border border-[#fde68a] bg-[#fef9c3] px-2 py-0.5 text-[10px] font-medium text-[#92400e]">
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
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

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
              {activeLead?.email && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-sm border border-border bg-background px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#1773cf]"
                  onClick={() => setEmailDialogOpen(true)}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold uppercase">
                    Email Quote
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

      {/* Best Matches */}
      {bestMatches.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#475569]">
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
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${othersOpen ? "rotate-180" : ""}`}
                />
                {othersOpen
                  ? "Hide other carriers"
                  : `Show ${allCarriers.length} more carrier${allCarriers.length === 1 ? "" : "s"}`}
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
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

      {/* Email Quote Dialog */}
      {activeLead && intakeData && (
        <EmailQuoteDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          leadId={activeLead.id}
          leadName={
            [activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ") ||
            intakeData.name
          }
          leadEmail={activeLead.email}
          coverageAmount={intakeData.coverageAmount}
          termLength={intakeData.termLength}
          topCarriers={bestMatches}
        />
      )}
    </div>
  )
}
