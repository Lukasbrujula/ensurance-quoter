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

function quoteKey(q: CarrierQuote): string {
  const base = q.productCode ? `${q.carrier.id}:${q.productCode}` : q.carrier.id
  if (q.tableRating) return `${base}:${q.tableRating}`
  if (q.termComparisonLength) return `${base}:tc${q.termComparisonLength}`
  if (q.productCategory && q.productCategory !== "term") return `${base}:${q.productCategory}`
  return base
}

type SortField = "matchScore" | "monthlyPremium" | "annualPremium" | "amBest" | "commission"

const EMPTY_QUOTES: CarrierQuote[] = []

interface CarrierResultsProps {
  onViewDetails?: (quote: CarrierQuote) => void
  productMode?: string
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex max-w-[56px] items-center whitespace-nowrap rounded-sm border border-[#bfdbfe] bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-medium text-[#1773cf]">
            {rating}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {rating} — {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      className="overflow-x-auto rounded-md border border-border shadow-sm"
      style={{ background: SCROLL_SHADOW_BG }}
    >
      <div className="min-w-[680px]">{children}</div>
    </div>
  )
}

function hasLivingBenefits(value: string): boolean {
  return value !== "None specified" && value.length > 0
}

const GRID_COLS = "grid-cols-[minmax(200px,2fr)_minmax(90px,1.2fr)_60px_80px_70px_60px_80px_32px]"

function ColumnHeaders() {
  return (
    <div className={`grid ${GRID_COLS} border-b border-border bg-muted/70`}>
      <div className="px-4 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Carrier
        </span>
      </div>
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Product Name
        </span>
      </div>
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Rating
        </span>
      </div>
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Monthly
        </span>
      </div>
      <div className="px-3 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Annual
        </span>
      </div>
      <div className="px-2 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
          Comm.
        </span>
      </div>
      <div className="px-3 py-2.5">
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
  const hasRateSpread =
    quote.rateClassSpread && quote.rateClassSpread.length > 1

  return (
    <div
      onClick={() => onViewDetails?.(quote)}
      className={`cursor-pointer border-b border-border bg-background last:border-b-0 transition-colors hover:bg-muted/60 ${
        quote.isBestValue
          ? "border-l-4 border-l-[#16a34a]"
          : ""
      }`}
    >
      {/* Line 1 — Data columns */}
      <div className={`grid ${GRID_COLS} items-center ${compact ? "py-3.5" : "py-5"}`}>
        {/* Carrier */}
        <div className="flex items-center gap-2 px-4">
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
            {quote.healthAnalyzerStatus && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${
                      quote.healthAnalyzerStatus === "go"
                        ? "bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0]"
                        : quote.healthAnalyzerStatus === "nogo"
                          ? "bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]"
                          : "bg-[#fef3c7] text-[#d97706] border border-[#fde68a]"
                    }`}>
                      {quote.healthAnalyzerStatus === "go" ? "✓" : quote.healthAnalyzerStatus === "nogo" ? "✕" : "?"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[300px] text-xs">
                    <p className="font-semibold">
                      {quote.healthAnalyzerStatus === "go"
                        ? "Health Analyzer: Likely Eligible"
                        : quote.healthAnalyzerStatus === "nogo"
                          ? "Health Analyzer: Likely Ineligible"
                          : "Health Analyzer: Insufficient Data"}
                    </p>
                    {quote.healthAnalyzerReason && (
                      <p className="mt-0.5 text-muted-foreground">{quote.healthAnalyzerReason}</p>
                    )}
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
        <div className="px-3">
          <span className="text-[12px] text-[#475569]">
            {quote.productCategory === "final-expense" && quote.compulifeProductName
              ? quote.compulifeProductName
              : quote.pricingSource === "compulife" ? quote.riskClass || quote.product.name : quote.product.name}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {quote.isGuaranteed && (
              <span className="inline-flex items-center rounded-sm border border-[#bbf7d0] bg-[#dcfce7] px-1.5 py-px text-[8px] font-bold uppercase text-[#15803d]">
                Gtd
              </span>
            )}
            {quote.tableRating && (
              <span className="inline-flex items-center rounded-sm border border-orange-200 bg-orange-50 px-1.5 py-px text-[8px] font-bold uppercase text-orange-700">
                {quote.tableRating}
              </span>
            )}
            {quote.termComparisonLength && (
              <span className="inline-flex items-center rounded-sm border border-sky-200 bg-sky-50 px-1.5 py-px text-[8px] font-bold text-sky-700">
                {quote.termComparisonLength}yr
              </span>
            )}
            {quote.finalExpenseType && (
              <span className={`inline-flex items-center rounded-sm px-1.5 py-px text-[8px] font-bold uppercase ${
                quote.finalExpenseType === "level"
                  ? "border border-[#bbf7d0] bg-[#dcfce7] text-[#15803d]"
                  : quote.finalExpenseType === "graded"
                    ? "border border-amber-200 bg-amber-50 text-amber-700"
                    : "border border-red-200 bg-red-50 text-red-700"
              }`}>
                {quote.finalExpenseType === "guaranteed-issue" ? "GI" : quote.finalExpenseType}
              </span>
            )}
            {quote.isGuaranteed === false && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-px text-[8px] font-bold uppercase text-amber-700">
                      <Info className="h-2.5 w-2.5" />
                      Illust.
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    Illustrated rate — premium may change over the term
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="px-3">
          <RatingBadge
            rating={quote.carrier.amBest}
            label={quote.carrier.amBestLabel}
          />
        </div>

        {/* Monthly */}
        <div className="px-3">
          <span
            className={`text-sm font-semibold tabular-nums tracking-tight ${
              quote.isBestValue ? "text-[#16a34a]" : "text-foreground"
            }`}
          >
            {formatCurrency(quote.monthlyPremium)}
          </span>
        </div>

        {/* Annual */}
        <div className="px-3">
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {formatCurrency(quote.annualPremium)}
          </span>
        </div>

        {/* Commission */}
        <div className="px-2">
          {commissionFirstYear > 0 ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-default">
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isHighestCommission ? "text-[#16a34a]" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(commissionFirstYear)}
                    </span>
                    <span className="block text-[9px] text-muted-foreground/70 whitespace-nowrap">
                      {commissionRateLabel.replace("% FY / ", "/").replace("% RN", "%")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {commissionRateLabel} — First year estimate
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
        <div className="flex flex-wrap items-center gap-2 overflow-hidden border-t border-border/60 bg-muted/20 px-5 pb-3.5 pt-3 pl-[76px]">
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

      {/* Line 3 — Rate class spread */}
      {hasRateSpread && (
        <div className="flex items-center gap-3 border-t border-dashed border-border/50 bg-muted/30 px-5 py-2.5 pl-[76px]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 shrink-0">
            Rate Classes
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {quote.rateClassSpread!.map((rc) => {
              const isCurrentClass = rc.rateClassCode === (quote.riskClass?.substring(0, 2).toUpperCase() ?? "")
                || rc.annualPremium === quote.annualPremium
              return (
                <span
                  key={rc.rateClassCode}
                  className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[10px] tabular-nums ${
                    isCurrentClass
                      ? "border border-[#1773cf]/30 bg-[#dbeafe] font-bold text-[#1773cf]"
                      : "border border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span className="font-medium">{rc.rateClass}</span>
                  <span>{formatCurrency(rc.monthlyPremium)}/mo</span>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function CarrierResults({
  onViewDetails,
  productMode = "term",
}: CarrierResultsProps) {
  const isFinalExpenseMode = productMode === "finalExpense"
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

  // FE type filters — all shown by default
  const [feShowLevel, setFeShowLevel] = useState(true)
  const [feShowGraded, setFeShowGraded] = useState(true)
  const [feShowGI, setFeShowGI] = useState(true)

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

  const ineligibleQuotes = useMemo(
    () => quotes.filter((q) => !q.isEligible && q.ineligibilityReason),
    [quotes],
  )

  // Split quotes by product category
  const termQuotes = useMemo(
    () => eligibleQuotes.filter((q) =>
      !q.productCategory || q.productCategory === "term"
    ),
    [eligibleQuotes],
  )
  const ropQuotes = useMemo(
    () => eligibleQuotes.filter((q) => q.productCategory === "rop"),
    [eligibleQuotes],
  )
  const termToAgeQuotes = useMemo(
    () => eligibleQuotes.filter((q) => q.productCategory === "term-to-age"),
    [eligibleQuotes],
  )
  const ropToAgeQuotes = useMemo(
    () => eligibleQuotes.filter((q) => q.productCategory === "rop-to-age"),
    [eligibleQuotes],
  )
  const tableRatedQuotes = useMemo(
    () => eligibleQuotes.filter((q) => q.productCategory === "table-rated"),
    [eligibleQuotes],
  )
  const ulQuotes = useMemo(
    () => eligibleQuotes.filter((q) => q.productCategory === "ul"),
    [eligibleQuotes],
  )
  const termComparisonQuotes = useMemo(
    () => eligibleQuotes.filter((q) => q.productCategory === "term-comparison"),
    [eligibleQuotes],
  )
  const finalExpenseQuotes = useMemo(
    () => eligibleQuotes.filter((q) => q.productCategory === "final-expense"),
    [eligibleQuotes],
  )

  // FE mode: group by finalExpenseType, sorted by premium
  const feLevelQuotes = useMemo(
    () => finalExpenseQuotes
      .filter((q) => q.finalExpenseType === "level")
      .sort((a, b) => a.monthlyPremium - b.monthlyPremium),
    [finalExpenseQuotes],
  )
  const feGradedQuotes = useMemo(
    () => finalExpenseQuotes
      .filter((q) => q.finalExpenseType === "graded")
      .sort((a, b) => a.monthlyPremium - b.monthlyPremium),
    [finalExpenseQuotes],
  )
  const feGuaranteedQuotes = useMemo(
    () => finalExpenseQuotes
      .filter((q) => q.finalExpenseType === "guaranteed-issue")
      .sort((a, b) => a.monthlyPremium - b.monthlyPremium),
    [finalExpenseQuotes],
  )

  const bestMatches = termQuotes.slice(0, 3)
  const allCarriers = termQuotes.slice(3)

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

      {/* ── FE Mode: Type-grouped display ──────────────────────────── */}
      {isFinalExpenseMode && finalExpenseQuotes.length > 0 && (
        <div className="space-y-6">
          {/* Filter chips */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground mr-1">
              Show:
            </span>
            <button
              type="button"
              onClick={() => setFeShowLevel((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                feShowLevel
                  ? "border-[#16a34a]/30 bg-[#dcfce7] text-[#16a34a]"
                  : "border-border bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${feShowLevel ? "bg-[#16a34a]" : "bg-muted-foreground/30"}`} />
              Level ({feLevelQuotes.length})
            </button>
            <button
              type="button"
              onClick={() => setFeShowGraded((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                feShowGraded
                  ? "border-[#d97706]/30 bg-[#fef3c7] text-[#d97706]"
                  : "border-border bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${feShowGraded ? "bg-[#d97706]" : "bg-muted-foreground/30"}`} />
              Graded ({feGradedQuotes.length})
            </button>
            <button
              type="button"
              onClick={() => setFeShowGI((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                feShowGI
                  ? "border-[#6b7280]/30 bg-[#f3f4f6] text-[#6b7280]"
                  : "border-border bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${feShowGI ? "bg-[#6b7280]" : "bg-muted-foreground/30"}`} />
              Guaranteed Issue ({feGuaranteedQuotes.length})
            </button>
          </div>

          {/* Level Section */}
          {feShowLevel && feLevelQuotes.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#16a34a]">
                  Level ({feLevelQuotes.length})
                </h4>
                <span className="text-[10px] text-muted-foreground/70">
                  Immediate full coverage from day one
                </span>
              </div>
              <ScrollableTable>
                <ColumnHeaders />
                {feLevelQuotes.map((quote) => {
                  const comm = commissionMap.get(quote.carrier.id)
                  return (
                    <CarrierRow
                      key={quoteKey(quote)}
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
          )}

          {/* Graded Section */}
          {feShowGraded && feGradedQuotes.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#d97706]" />
                <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#d97706]">
                  Graded ({feGradedQuotes.length})
                </h4>
                <span className="text-[10px] text-muted-foreground/70">
                  Partial payout years 1-2, full benefit after
                </span>
              </div>
              <ScrollableTable>
                <ColumnHeaders />
                {feGradedQuotes.map((quote) => {
                  const comm = commissionMap.get(quote.carrier.id)
                  return (
                    <CarrierRow
                      key={quoteKey(quote)}
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
          )}

          {/* Guaranteed Issue Section */}
          {feShowGI && feGuaranteedQuotes.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#6b7280]" />
                <h4 className="text-[11px] font-bold uppercase tracking-[0.5px] text-[#6b7280]">
                  Guaranteed Issue ({feGuaranteedQuotes.length})
                </h4>
                <span className="text-[10px] text-muted-foreground/70">
                  No health questions — 2-year waiting period
                </span>
              </div>
              <ScrollableTable>
                <ColumnHeaders />
                {feGuaranteedQuotes.map((quote) => {
                  const comm = commissionMap.get(quote.carrier.id)
                  return (
                    <CarrierRow
                      key={quoteKey(quote)}
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
          )}

          {/* All filters turned off */}
          {!feShowLevel && !feShowGraded && !feShowGI && (
            <div className="flex h-24 items-center justify-center rounded-sm border border-border bg-background">
              <p className="text-[12px] text-muted-foreground">
                All product types are hidden. Toggle a filter above to see results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* FE Mode: Empty state when no FE quotes */}
      {isFinalExpenseMode && finalExpenseQuotes.length === 0 && hasQuoteResponse && !isLoading && (
        <EmptyState
          compact
          icon={<AlertCircle className="text-muted-foreground" />}
          title="No final expense carriers available"
          description="Try adjusting coverage amount or check age eligibility (45+)."
        />
      )}

      {/* ── Term Mode: Standard display ────────────────────────────── */}
      {/* Best Matches */}
      {!isFinalExpenseMode && bestMatches.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2.5 border-l-2 border-[#1773cf] pl-3">
            <Star className="h-3.5 w-3.5 text-[#1773cf]" />
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#1773cf]">
              Best Matches
            </h4>
            <span className="text-[10px] text-muted-foreground/60">
              Top carriers for this profile
            </span>
          </div>
          <ScrollableTable>
            <ColumnHeaders />
            {bestMatches.map((quote) => {
              const comm = commissionMap.get(quote.carrier.id)
              return (
                <CarrierRow
                  key={quoteKey(quote)}
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
      {!isFinalExpenseMode && allCarriers.length > 0 && (
        <Collapsible open={othersOpen} onOpenChange={setOthersOpen} className="mt-6">
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
                      key={quoteKey(quote)}
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

      {/* ROP (Return of Premium) Section */}
      {!isFinalExpenseMode && ropQuotes.length > 0 && (
        <Collapsible defaultOpen className="mt-6">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-[12px] text-muted-foreground transition-colors hover:text-[#1773cf]"
            >
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown className="h-3.5 w-3.5" />
                Return of Premium ({ropQuotes.length} carrier{ropQuotes.length === 1 ? "" : "s"})
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 dark:border-blue-800 dark:bg-blue-950/30">
              <Info className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-blue-700/80 dark:text-blue-400/80">
                Return of Premium policies refund all premiums paid if you outlive the term. Premiums are higher than standard term.
              </p>
            </div>
            <ScrollableTable>
              <ColumnHeaders />
              {ropQuotes.map((quote) => {
                const comm = commissionMap.get(quote.carrier.id)
                return (
                  <CarrierRow
                    key={quoteKey(quote)}
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Term-to-Age Section */}
      {!isFinalExpenseMode && termToAgeQuotes.length > 0 && (
        <Collapsible defaultOpen className="mt-6">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-[12px] text-muted-foreground transition-colors hover:text-[#1773cf]"
            >
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown className="h-3.5 w-3.5" />
                Level-to-Age ({termToAgeQuotes.length} carrier{termToAgeQuotes.length === 1 ? "" : "s"})
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 dark:border-emerald-800 dark:bg-emerald-950/30">
              <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-emerald-700/80 dark:text-emerald-400/80">
                Level-to-age policies guarantee the same premium until the target age. Ideal for clients who want coverage through retirement.
              </p>
            </div>
            <ScrollableTable>
              <ColumnHeaders />
              {termToAgeQuotes.map((quote) => {
                const comm = commissionMap.get(quote.carrier.id)
                return (
                  <CarrierRow
                    key={quoteKey(quote)}
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Table-Rated Section */}
      {!isFinalExpenseMode && tableRatedQuotes.length > 0 && (
        <Collapsible defaultOpen className="mt-6">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-[12px] text-muted-foreground transition-colors hover:text-[#1773cf]"
            >
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown className="h-3.5 w-3.5" />
                Table Rated ({tableRatedQuotes.length} result{tableRatedQuotes.length === 1 ? "" : "s"})
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50/60 px-3 py-2 dark:border-orange-800 dark:bg-orange-950/30">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-orange-700/80 dark:text-orange-400/80">
                Table-rated premiums apply to clients with significant health conditions. T1 = +25%, T2 = +50%, T3 = +75%, T4 = +100% above standard rates.
              </p>
            </div>
            <ScrollableTable>
              <ColumnHeaders />
              {tableRatedQuotes.map((quote) => {
                const comm = commissionMap.get(quote.carrier.id)
                return (
                  <CarrierRow
                    key={quoteKey(quote)}
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* ROP-to-Age Section */}
      {!isFinalExpenseMode && ropToAgeQuotes.length > 0 && (
        <Collapsible defaultOpen className="mt-6">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-[12px] text-muted-foreground transition-colors hover:text-[#1773cf]"
            >
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown className="h-3.5 w-3.5" />
                ROP Level-to-Age ({ropToAgeQuotes.length} carrier{ropToAgeQuotes.length === 1 ? "" : "s"})
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50/60 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30">
              <Info className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-violet-700/80 dark:text-violet-400/80">
                Return of Premium with level-to-age guarantee. Combines premium refund with guaranteed coverage to a target age. Available for ages 65, 70, and 75.
              </p>
            </div>
            <ScrollableTable>
              <ColumnHeaders />
              {ropToAgeQuotes.map((quote) => {
                const comm = commissionMap.get(quote.carrier.id)
                return (
                  <CarrierRow
                    key={quoteKey(quote)}
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* No-Lapse Universal Life Section */}
      {!isFinalExpenseMode && ulQuotes.length > 0 && (
        <Collapsible defaultOpen className="mt-6">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-[12px] text-muted-foreground transition-colors hover:text-[#1773cf]"
            >
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown className="h-3.5 w-3.5" />
                No-Lapse Universal Life ({ulQuotes.length} carrier{ulQuotes.length === 1 ? "" : "s"})
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-indigo-200 bg-indigo-50/60 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950/30">
              <Info className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-indigo-700/80 dark:text-indigo-400/80">
                Permanent life insurance guaranteed to age 121 with no-lapse protection. Higher premiums than term but builds cash value and never expires.
              </p>
            </div>
            <ScrollableTable>
              <ColumnHeaders />
              {ulQuotes.map((quote) => {
                const comm = commissionMap.get(quote.carrier.id)
                return (
                  <CarrierRow
                    key={quoteKey(quote)}
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Term Comparison Section */}
      {!isFinalExpenseMode && termComparisonQuotes.length > 0 && (
        <Collapsible defaultOpen className="mt-6">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 py-3 text-[12px] text-muted-foreground transition-colors hover:text-[#1773cf]"
            >
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown className="h-3.5 w-3.5" />
                Term Comparison ({termComparisonQuotes.length} result{termComparisonQuotes.length === 1 ? "" : "s"})
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50/60 px-3 py-2 dark:border-sky-800 dark:bg-sky-950/30">
              <Info className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-sky-700/80 dark:text-sky-400/80">
                Side-by-side pricing at different term lengths. Each row shows the cheapest product per carrier at that term.
              </p>
            </div>
            <ScrollableTable>
              <ColumnHeaders />
              {termComparisonQuotes.map((quote) => {
                const comm = commissionMap.get(quote.carrier.id)
                return (
                  <CarrierRow
                    key={quoteKey(quote)}
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Final Expense Section (term mode only — shows as add-on) */}
      {!isFinalExpenseMode && finalExpenseQuotes.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="mt-6 mb-3 flex w-full items-center gap-3 text-[11px] uppercase tracking-widest text-[#7c3aed] hover:text-[#6d28d9]"
            >
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="flex items-center gap-1.5 font-bold">
                <ChevronDown className="h-3.5 w-3.5" />
                Final Expense ({finalExpenseQuotes.length} product{finalExpenseQuotes.length === 1 ? "" : "s"})
              </span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mb-3 flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50/60 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30">
              <Info className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-violet-700/80 dark:text-violet-400/80">
                Simplified issue whole life insurance for end-of-life expenses. Coverage $5K-$50K. Products are Level (immediate), Graded (partial payout years 1-2), or Guaranteed Issue (no health questions, 2-year waiting period).
              </p>
            </div>
            <ScrollableTable>
              <ColumnHeaders />
              {finalExpenseQuotes.map((quote) => {
                const comm = commissionMap.get(quote.carrier.id)
                return (
                  <CarrierRow
                    key={quoteKey(quote)}
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
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Ineligible Carriers Section */}
      {ineligibleQuotes.length > 0 && !isLoading && (
        <Collapsible defaultOpen={false} className="mt-4">
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:hover:bg-red-950/50 cursor-pointer group">
            <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />
            <span className="text-[11px] font-bold text-red-700 dark:text-red-400">
              Ineligible Carriers ({ineligibleQuotes.length})
            </span>
            <span className="text-[10px] text-red-500 dark:text-red-400/70 ml-1">
              — declined based on client profile
            </span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 text-red-400 transition-transform group-data-[state=open]:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-1.5">
              {ineligibleQuotes.map((quote) => (
                <div
                  key={`ineligible-${quote.carrier.id}-${quote.productCode ?? ""}`}
                  className="flex items-center gap-3 rounded-md border border-red-100 bg-white px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/10"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/30">
                    <CarrierLogo carrier={quote.carrier} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground/70 truncate">
                      {quote.carrier.name}
                    </p>
                    <p className="text-[10px] text-red-600 dark:text-red-400 truncate">
                      {quote.ineligibilityReason}
                    </p>
                  </div>
                  {quote.underwritingWarnings && quote.underwritingWarnings.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                            <span className="text-[9px] font-bold text-red-400">
                              {quote.underwritingWarnings.length}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[280px]">
                          <div className="space-y-1">
                            {quote.underwritingWarnings.map((w, i) => (
                              <div key={i} className="text-xs">
                                <span className="font-semibold">{w.label}</span>
                                {w.detail && (
                                  <span className="text-muted-foreground"> — {w.detail}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ))}
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
