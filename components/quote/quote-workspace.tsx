"use client"

import { useState, useCallback, useMemo, useRef, useEffect, type KeyboardEvent } from "react"
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels"
import {
  ClipboardList,
  Sparkles,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { IntakeForm } from "@/components/quote/intake-form"
import { CarrierResults } from "@/components/quote/carrier-results"
import { CarrierDetailModal } from "@/components/quote/carrier-detail-modal"
import {
  CompareFloatingButton,
  ComparisonSheet,
} from "@/components/quote/carrier-comparison"
import { AiAssistantPanel } from "@/components/quote/ai-assistant-panel"
import { PanelDialer } from "@/components/calling/panel-dialer"
import { LeadDetailsSection } from "@/components/leads/lead-details-section"
import { useLeadStore } from "@/lib/store/lead-store"
import { useUIStore } from "@/lib/store/ui-store"
import { toast } from "sonner"
import type { CarrierQuote } from "@/lib/types"

/* ------------------------------------------------------------------ */
/*  Coverage amount helpers                                            */
/* ------------------------------------------------------------------ */

const TERM_COVERAGE_PRESETS = [100000, 250000, 500000, 750000, 1000000, 2000000, 5000000] as const
const FE_COVERAGE_PRESETS = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000] as const

const TERM_MIN = 25000
const TERM_MAX = 10000000
const FE_MIN = 5000
const FE_MAX = 50000

function formatCoverageDisplay(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPresetLabel(amount: number): string {
  if (amount >= 1_000_000) return `$${amount / 1_000_000}M`
  return `$${amount / 1_000}K`
}

function clampCoverage(raw: number, min: number, max: number): number {
  const rounded = Math.round(raw / 1000) * 1000
  return Math.min(max, Math.max(min, rounded))
}

/* ── Coverage Amount Input ────────────────────────────────────────── */

function CoverageAmountInput({
  value,
  onChange,
  isFinalExpense,
}: {
  value: number
  onChange: (amount: number) => void
  isFinalExpense: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const min = isFinalExpense ? FE_MIN : TERM_MIN
  const max = isFinalExpense ? FE_MAX : TERM_MAX
  const presets = isFinalExpense ? FE_COVERAGE_PRESETS : TERM_COVERAGE_PRESETS

  const startEditing = () => {
    setEditing(true)
    setDraft(String(value))
    setValidationError(null)
    requestAnimationFrame(() => inputRef.current?.select())
  }

  const commitValue = () => {
    setEditing(false)
    const stripped = draft.replace(/[^0-9]/g, "")
    const parsed = parseInt(stripped, 10)
    if (Number.isNaN(parsed) || parsed === 0) {
      setValidationError(null)
      return
    }
    if (parsed < min) {
      setValidationError(`Minimum coverage is ${formatCoverageDisplay(min)}`)
      onChange(min)
      return
    }
    if (parsed > max) {
      setValidationError(`Maximum coverage is ${formatCoverageDisplay(max)}`)
      onChange(max)
      return
    }
    setValidationError(null)
    onChange(clampCoverage(parsed, min, max))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitValue()
    }
    if (e.key === "Escape") {
      setEditing(false)
      setDraft("")
      setValidationError(null)
    }
  }

  const handleDraftChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, "")
    if (digitsOnly === "") {
      setDraft("")
      return
    }
    const num = parseInt(digitsOnly, 10)
    setDraft(new Intl.NumberFormat("en-US").format(num))
  }

  return (
    <div className="flex-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
        Coverage Amount
      </span>

      {/* Editable currency input */}
      <div className="mt-2">
        {editing ? (
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] font-bold text-[#1773cf]">
              $
            </span>
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              onBlur={commitValue}
              onKeyDown={handleKeyDown}
              className="h-auto rounded-sm border-[#1773cf] bg-background pl-8 pr-3 py-1.5 text-[20px] font-bold text-[#1773cf] tabular-nums ring-1 ring-[#1773cf]/30"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditing}
            className="w-full cursor-text rounded-sm border border-border bg-background px-3 py-1.5 text-left text-[20px] font-bold text-[#1773cf] tabular-nums transition-colors hover:border-[#1773cf]/50"
          >
            {formatCoverageDisplay(value)}
          </button>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="mt-1.5 text-[11px] text-destructive">{validationError}</p>
      )}

      {/* FE mode: slider with $1K steps */}
      {isFinalExpense && (
        <div className="mt-3">
          <Slider
            value={[value]}
            onValueChange={([v]) => {
              onChange(v)
              setValidationError(null)
            }}
            min={FE_MIN}
            max={FE_MAX}
            step={1000}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{formatCoverageDisplay(FE_MIN)}</span>
            <span>{formatCoverageDisplay(FE_MAX)}</span>
          </div>
        </div>
      )}

      {/* Preset shortcut buttons */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              onChange(preset)
              setValidationError(null)
            }}
            className={`rounded-sm px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
              value === preset
                ? "bg-[#1773cf] text-white shadow-[0px_2px_4px_0px_rgba(23,115,207,0.3)]"
                : "border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {formatPresetLabel(preset)}
          </button>
        ))}
      </div>
    </div>
  )
}

function formatCoverageCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${amount / 1_000_000}M`
  return `$${amount / 1_000}K`
}

/* ------------------------------------------------------------------ */
/*  Collapsed icon bar                                                 */
/* ------------------------------------------------------------------ */

interface CollapsedBarProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onExpand: () => void
  side: "left" | "right"
}

function CollapsedBar({ icon: Icon, label, onExpand, side }: CollapsedBarProps) {
  const ExpandIcon = side === "left" ? PanelLeftOpen : PanelRightOpen
  return (
    <div className="flex h-full w-full cursor-pointer flex-col items-center border-x border-border bg-muted py-3 transition-colors hover:bg-muted" onClick={onExpand} role="button" tabIndex={0} aria-label={`Expand ${label}`} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onExpand() } }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onExpand() }}
        className="flex flex-col items-center gap-2 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-[#e2e8f0] hover:text-foreground"
        title={`Expand ${label}`}
      >
        <ExpandIcon className="h-4 w-4" />
      </button>
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <Icon className="h-4 w-4 text-[#94a3b8]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#94a3b8] [writing-mode:vertical-lr]">
          {label}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Center panel collapsed bar                                         */
/* ------------------------------------------------------------------ */

interface CenterCollapsedBarProps {
  coverageAmount: number
  termLength: number
  eligibleCount: number
  onExpand: () => void
}

function CenterCollapsedBar({
  coverageAmount,
  termLength,
  eligibleCount,
  onExpand,
}: CenterCollapsedBarProps) {
  return (
    <div
      className="flex h-full w-full cursor-pointer flex-col items-center border-x border-border bg-muted py-3 transition-colors hover:bg-muted"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      aria-label="Expand quote results"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onExpand()
        }
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand()
        }}
        className="flex flex-col items-center gap-2 rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-[#e2e8f0] hover:text-foreground"
        title="Expand quote results"
      >
        <Maximize2 className="h-4 w-4" />
      </button>
      <div className="mt-3 flex flex-col items-center gap-3">
        <BarChart3 className="h-4 w-4 text-[#94a3b8]" />
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#94a3b8] [writing-mode:vertical-lr]">
          Quotes
        </span>
        <span className="text-[8px] font-bold text-[#1773cf] [writing-mode:vertical-lr]">
          {formatCoverageCompact(coverageAmount)} · {termLength}Y
        </span>
        {eligibleCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dcfce7] text-[9px] font-bold text-[#16a34a]">
            {eligibleCount}
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  QuoteWorkspace                                                     */
/* ------------------------------------------------------------------ */

const COLLAPSED_SIZE = 3
const LEFT_MIN = 15
const CENTER_MIN = 25
const RIGHT_MIN = 15

/**
 * Shared three-column quote workspace used by both /quote and /leads/[id].
 * Reads all domain state from Zustand — the parent page is responsible for
 * initializing the store (e.g., setting activeLead) before mounting this.
 */
const FE_DEFAULT_COVERAGE = 10000
const TERM_DEFAULT_COVERAGE = 1000000

export function QuoteWorkspace({ productMode = "term" }: { productMode?: string }) {
  const isFinalExpenseMode = productMode === "finalExpense"
  const quoteResponse = useLeadStore((s) => s.quoteResponse)
  const isLoading = useLeadStore((s) => s.isQuoteLoading)
  const selectedCarrierIds = useLeadStore((s) => s.selectedCarrierIds)
  const coverageAmount = useLeadStore((s) => s.coverageAmount)
  const termLength = useLeadStore((s) => s.termLength)
  const intakeData = useLeadStore((s) => s.intakeData)
  const fetchQuotes = useLeadStore((s) => s.fetchQuotes)
  const clearQuoteSession = useLeadStore((s) => s.clearQuoteSession)
  const setCoverageAmount = useLeadStore((s) => s.setCoverageAmount)
  const setTermLength = useLeadStore((s) => s.setTermLength)
  const setQuoteResponse = useLeadStore((s) => s.setQuoteResponse)

  // Reset coverage and clear stale results when switching between product modes
  const prevModeRef = useRef(productMode)
  useEffect(() => {
    if (prevModeRef.current === productMode) return
    prevModeRef.current = productMode

    // Clear previous results — prevents Term results showing in FE tab (or vice versa)
    setQuoteResponse(null)

    if (isFinalExpenseMode) {
      // Entering FE mode — snap to FE range
      setCoverageAmount(FE_DEFAULT_COVERAGE)
    } else {
      // Leaving FE mode — restore term default
      setCoverageAmount(TERM_DEFAULT_COVERAGE)
    }
  }, [productMode, isFinalExpenseMode, setCoverageAmount, setQuoteResponse])

  const leftOpen = useUIStore((s) => s.leftPanelOpen)
  const centerOpen = useUIStore((s) => s.centerPanelOpen)
  const rightOpen = useUIStore((s) => s.rightPanelOpen)
  const setLeftPanelOpen = useUIStore((s) => s.setLeftPanelOpen)
  const setCenterPanelOpen = useUIStore((s) => s.setCenterPanelOpen)
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen)
  const setPanelSizes = useUIStore((s) => s.setPanelSizes)

  // Capture initial sizes as a stable ref so defaultSize never changes
  const initialSizesRef = useRef(useUIStore.getState().panelSizes)

  const leftPanelRef = useRef<PanelImperativeHandle | null>(null)
  const centerPanelRef = useRef<PanelImperativeHandle | null>(null)
  const rightPanelRef = useRef<PanelImperativeHandle | null>(null)

  const [detailQuote, setDetailQuote] = useState<CarrierQuote | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)

  const handleViewDetails = useCallback((quote: CarrierQuote) => {
    setDetailQuote(quote)
    setIsDetailOpen(true)
  }, [])

  const selectedQuotes = useMemo(() => {
    if (!quoteResponse) return []
    return quoteResponse.quotes.filter((q) =>
      selectedCarrierIds.has(q.carrier.id),
    )
  }, [quoteResponse, selectedCarrierIds])

  const eligibleCount = quoteResponse
    ? quoteResponse.quotes.filter((q) => q.isEligible).length
    : 0

  /* ── Panel collapse / expand handlers ──────────────────────────── */

  const handleLeftCollapse = useCallback(() => {
    leftPanelRef.current?.collapse()
  }, [])

  const handleLeftExpand = useCallback(() => {
    leftPanelRef.current?.expand()
  }, [])

  const handleCenterCollapse = useCallback(() => {
    centerPanelRef.current?.collapse()
  }, [])

  const handleCenterExpand = useCallback(() => {
    centerPanelRef.current?.expand()
  }, [])

  const handleRightCollapse = useCallback(() => {
    rightPanelRef.current?.collapse()
  }, [])

  const handleRightExpand = useCallback(() => {
    rightPanelRef.current?.expand()
  }, [])

  /* ── Sync collapse state to UIStore via onResize ───────────────── */

  const handleLeftResize = useCallback(
    (panelSize: PanelSize) => {
      setLeftPanelOpen(panelSize.asPercentage > COLLAPSED_SIZE)
    },
    [setLeftPanelOpen],
  )

  const handleCenterResize = useCallback(
    (panelSize: PanelSize) => {
      setCenterPanelOpen(panelSize.asPercentage > COLLAPSED_SIZE)
    },
    [setCenterPanelOpen],
  )

  const handleRightResize = useCallback(
    (panelSize: PanelSize) => {
      setRightPanelOpen(panelSize.asPercentage > COLLAPSED_SIZE)
    },
    [setRightPanelOpen],
  )

  /* ── Auto-expand center panel when fetching quotes ────────────── */

  const activeLead = useLeadStore((s) => s.activeLead)
  const updateActiveLead = useLeadStore((s) => s.updateActiveLead)
  const markFieldDirty = useLeadStore((s) => s.markFieldDirty)

  const handleFetchQuotes = useCallback(
    async (request: Parameters<typeof fetchQuotes>[0]) => {
      centerPanelRef.current?.expand()
      await fetchQuotes(request)

      // Auto-advance: suggest "Quoted" status after generating quotes
      const lead = useLeadStore.getState().activeLead
      if (lead && (lead.status === "new" || lead.status === "contacted")) {
        toast("Move lead to Quoted?", {
          action: {
            label: "Yes, update",
            onClick: () => {
              updateActiveLead({
                status: "quoted",
                statusUpdatedAt: new Date().toISOString(),
              })
              markFieldDirty("status")
              markFieldDirty("statusUpdatedAt")
              toast.success("Lead status updated to Quoted")
            },
          },
          duration: 8000,
        })
      }
    },
    [fetchQuotes, updateActiveLead, markFieldDirty],
  )

  /* ── Persist sizes after resize completes ──────────────────────── */

  const handleLayoutChanged = useCallback(
    (layout: Record<string, number>) => {
      const left = layout["left"]
      const center = layout["center"]
      const right = layout["right"]
      if (left === undefined || center === undefined || right === undefined) return

      // Don't persist collapsed sizes — keep the last expanded size
      const prev = useUIStore.getState().panelSizes
      const newLeft = left <= COLLAPSED_SIZE ? prev.left : left
      const newCenter = center <= COLLAPSED_SIZE ? prev.center : center
      const newRight = right <= COLLAPSED_SIZE ? prev.right : right

      // Skip update if values haven't meaningfully changed (prevents infinite loop)
      if (
        Math.abs(newLeft - prev.left) < 0.5 &&
        Math.abs(newCenter - prev.center) < 0.5 &&
        Math.abs(newRight - prev.right) < 0.5
      ) return

      setPanelSizes({ left: newLeft, center: newCenter, right: newRight })
    },
    [setPanelSizes],
  )

  /* ── Double-click handle to reset sizes ────────────────────────── */

  const handleDoubleClickReset = useCallback(() => {
    if (leftPanelRef.current?.isCollapsed()) {
      leftPanelRef.current.expand()
    }
    leftPanelRef.current?.resize("30")

    if (centerPanelRef.current?.isCollapsed()) {
      centerPanelRef.current.expand()
    }
    centerPanelRef.current?.resize("45")

    if (rightPanelRef.current?.isCollapsed()) {
      rightPanelRef.current.expand()
    }
    rightPanelRef.current?.resize("25")
  }, [])

  return (
    <>
      {/* Body — Resizable Three-Column Layout */}
      <ResizablePanelGroup
        orientation="horizontal"
        onLayoutChanged={handleLayoutChanged}
        className="flex-1"
      >
        {/* ── Left Panel: Intake Form ──────────────────────────────── */}
        <ResizablePanel
          id="left"
          panelRef={leftPanelRef}
          defaultSize={initialSizesRef.current.left}
          minSize={LEFT_MIN}
          collapsible
          collapsedSize={COLLAPSED_SIZE}
          onResize={handleLeftResize}
        >
          <div className={leftOpen ? "flex h-full flex-col overflow-hidden border-r border-border bg-background shadow-sm" : "hidden"}>
            {/* Collapse button */}
            <div className="flex items-center justify-end border-b border-border px-2 py-1">
              <button
                type="button"
                onClick={handleLeftCollapse}
                className="rounded-sm p-2 cursor-pointer text-[#94a3b8] transition-colors hover:bg-muted hover:text-[#475569]"
                title="Collapse intake form"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <IntakeForm onSubmit={handleFetchQuotes} onClear={clearQuoteSession} isLoading={isLoading} productMode={productMode} />
              <LeadDetailsSection />
            </div>
          </div>
          <div className={leftOpen ? "hidden" : "h-full"}>
            <CollapsedBar
              icon={ClipboardList}
              label="Intake"
              onExpand={handleLeftExpand}
              side="left"
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle onDoubleClick={handleDoubleClickReset} />

        {/* ── Center Panel: Results ────────────────────────────────── */}
        <ResizablePanel
          id="center"
          panelRef={centerPanelRef}
          defaultSize={initialSizesRef.current.center}
          minSize={CENTER_MIN}
          collapsible
          collapsedSize={COLLAPSED_SIZE}
          onResize={handleCenterResize}
        >
          <div className={centerOpen ? "relative flex h-full flex-col overflow-hidden" : "hidden"}>
            {/* Expand tab — left panel collapsed */}
            {!leftOpen && (
              <button
                type="button"
                onClick={handleLeftExpand}
                className="absolute left-0 top-1/2 z-20 flex h-14 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-md border border-l-0 border-border bg-primary/10 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
                aria-label="Expand intake panel"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {/* Expand tab — right panel collapsed */}
            {!rightOpen && (
              <button
                type="button"
                onClick={handleRightExpand}
                className="absolute right-0 top-1/2 z-20 flex h-14 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-md border border-r-0 border-border bg-primary/10 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground"
                aria-label="Expand AI assistant panel"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
            <main className="h-full overflow-y-auto p-6">
              {/* Title Section */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h1 className="text-[24px] font-bold text-foreground">
                    {isFinalExpenseMode ? "Final Expense Quote Engine" : "Term Life Quote Engine"}
                  </h1>
                  <div className="mt-1 flex items-center gap-3 text-[13px]">
                    <span className="inline-flex items-center rounded-sm bg-[#1773cf] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Live Session
                    </span>
                    {quoteResponse && (
                      <span className="text-[#475569]">
                        {quoteResponse.clientSummary}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[12px]">
                  <span className="text-muted-foreground">API STATUS:</span>
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#bbf7d0] bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                    {quoteResponse
                      ? `${eligibleCount} ELIGIBLE`
                      : "READY"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCenterCollapse}
                    className="rounded-sm p-2 cursor-pointer text-[#94a3b8] transition-colors hover:bg-muted hover:text-[#475569]"
                    title="Minimize quote results"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Coverage + Term Row */}
              <div className="mb-6 rounded-sm border border-border bg-background p-6">
                <div className="flex gap-12">
                  {/* Coverage Amount */}
                  <CoverageAmountInput
                    value={coverageAmount}
                    onChange={setCoverageAmount}
                    isFinalExpense={isFinalExpenseMode}
                  />

                  {/* Term Duration — hidden in FE mode */}
                  {!isFinalExpenseMode && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
                        Term Duration
                      </span>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {([10, 15, 20, 25, 30, 35, 40] as const).map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => setTermLength(term)}
                            className={`rounded-sm px-3 py-2 text-[13px] font-bold transition-colors ${
                              termLength === term
                                ? "bg-[#1773cf] text-white shadow-[0px_2px_4px_0px_rgba(23,115,207,0.3)]"
                                : "border border-border bg-background text-[#475569] hover:bg-muted"
                            }`}
                          >
                            {term}Y
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FE mode: product type legend */}
                  {isFinalExpenseMode && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
                        Product Types
                      </span>
                      <div className="mt-3 flex flex-col gap-1.5">
                        <span className="text-[11px] text-muted-foreground">
                          <span className="inline-block h-2 w-2 rounded-full bg-[#16a34a] mr-1.5" />
                          Level — Full coverage day one
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          <span className="inline-block h-2 w-2 rounded-full bg-[#d97706] mr-1.5" />
                          Graded — Partial payout yrs 1-2
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          <span className="inline-block h-2 w-2 rounded-full bg-[#6b7280] mr-1.5" />
                          Guaranteed Issue — No health Qs
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Market Comparison */}
              {quoteResponse ? (
                <CarrierResults
                  onViewDetails={handleViewDetails}
                  productMode={productMode}
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-sm border border-border bg-background">
                  <p className="text-[13px] text-[#94a3b8]">
                    Loading quote data...
                  </p>
                </div>
              )}
            </main>
          </div>
          <div className={centerOpen ? "hidden" : "h-full"}>
            <CenterCollapsedBar
              coverageAmount={coverageAmount}
              termLength={termLength}
              eligibleCount={eligibleCount}
              onExpand={handleCenterExpand}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle onDoubleClick={handleDoubleClickReset} />

        {/* ── Right Panel: AI Assistant ─────────────────────────────── */}
        <ResizablePanel
          id="right"
          panelRef={rightPanelRef}
          defaultSize={initialSizesRef.current.right}
          minSize={RIGHT_MIN}
          collapsible
          collapsedSize={COLLAPSED_SIZE}
          onResize={handleRightResize}
        >
          <div className={rightOpen ? "flex h-full flex-col overflow-hidden border-l border-border" : "hidden"}>
            {/* Collapse button */}
            <div className="flex items-center justify-start border-b border-border bg-background px-2 py-1">
              <button
                type="button"
                onClick={handleRightCollapse}
                className="rounded-sm p-2 cursor-pointer text-[#94a3b8] transition-colors hover:bg-muted hover:text-[#475569]"
                title="Collapse AI panel"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            {/* Persistent dialer — always visible */}
            <PanelDialer />
            <div className="min-h-0 flex-1">
              <AiAssistantPanel onExpand={handleRightExpand} />
            </div>
          </div>
          <div className={rightOpen ? "hidden" : "h-full"}>
            <CollapsedBar
              icon={Sparkles}
              label="AI Assistant"
              onExpand={handleRightExpand}
              side="right"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Bottom Status Bar */}
      <footer className="flex items-center justify-between border-t border-border bg-background px-6 py-2 shadow-[0px_-1px_3px_0px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ESC
            </kbd>{" "}
            Clear All
          </span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ALT+S
            </kbd>{" "}
            Sync CRM
          </span>
          <span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              ALT+Q
            </kbd>{" "}
            New Quote
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#16a34a]">
          <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
          Carrier Cloud Connected
        </div>
      </footer>

      {/* Modals */}
      <CarrierDetailModal
        quote={detailQuote}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        clientConditions={intakeData?.medicalConditions}
        buildInput={
          intakeData?.heightFeet !== undefined &&
          intakeData?.heightInches !== undefined &&
          intakeData?.weight !== undefined &&
          intakeData?.gender
            ? {
                heightFeet: intakeData.heightFeet,
                heightInches: intakeData.heightInches,
                weight: intakeData.weight,
                gender: intakeData.gender,
              }
            : undefined
        }
      />

      <CompareFloatingButton
        count={selectedCarrierIds.size}
        onClick={() => setIsComparisonOpen(true)}
      />

      <ComparisonSheet
        selectedQuotes={selectedQuotes}
        open={isComparisonOpen}
        onOpenChange={setIsComparisonOpen}
      />
    </>
  )
}
