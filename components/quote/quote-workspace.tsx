"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import type { PanelImperativeHandle, PanelSize } from "react-resizable-panels"
import {
  ClipboardList,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react"
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
import { useLeadStore } from "@/lib/store/lead-store"
import { useUIStore } from "@/lib/store/ui-store"
import type { CarrierQuote } from "@/lib/types"

/* ------------------------------------------------------------------ */
/*  Coverage slider helpers                                            */
/* ------------------------------------------------------------------ */

const COVERAGE_STEPS = [
  100000, 150000, 200000, 250000, 300000, 400000, 500000, 750000,
  1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000,
  6000000, 7500000, 10000000,
] as const

function formatCoverageDisplay(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function coverageToSlider(amount: number): number {
  const index = COVERAGE_STEPS.findIndex((step) => step >= amount)
  return index === -1 ? COVERAGE_STEPS.length - 1 : index
}

function sliderToCoverage(index: number): number {
  return COVERAGE_STEPS[Math.round(index)] ?? COVERAGE_STEPS[0]
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
    <div className="flex h-full w-full flex-col items-center bg-white py-3">
      <button
        type="button"
        onClick={onExpand}
        className="flex flex-col items-center gap-2 rounded-sm p-1.5 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
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
export function QuoteWorkspace() {
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

  const leftOpen = useUIStore((s) => s.leftPanelOpen)
  const rightOpen = useUIStore((s) => s.rightPanelOpen)
  const setLeftPanelOpen = useUIStore((s) => s.setLeftPanelOpen)
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen)
  const setPanelSizes = useUIStore((s) => s.setPanelSizes)

  // Capture initial sizes as a stable ref so defaultSize never changes
  const initialSizesRef = useRef(useUIStore.getState().panelSizes)

  const leftPanelRef = useRef<PanelImperativeHandle | null>(null)
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

  const handleRightResize = useCallback(
    (panelSize: PanelSize) => {
      setRightPanelOpen(panelSize.asPercentage > COLLAPSED_SIZE)
    },
    [setRightPanelOpen],
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
      const newRight = right <= COLLAPSED_SIZE ? prev.right : right

      // Skip update if values haven't meaningfully changed (prevents infinite loop)
      if (
        Math.abs(newLeft - prev.left) < 0.5 &&
        Math.abs(center - prev.center) < 0.5 &&
        Math.abs(newRight - prev.right) < 0.5
      ) return

      setPanelSizes({ left: newLeft, center, right: newRight })
    },
    [setPanelSizes],
  )

  /* ── Double-click handle to reset sizes ────────────────────────── */

  const handleDoubleClickReset = useCallback(() => {
    if (leftPanelRef.current?.isCollapsed()) {
      leftPanelRef.current.expand()
    }
    leftPanelRef.current?.resize("30")

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
          <div className={leftOpen ? "flex h-full flex-col overflow-hidden border-r border-[#e2e8f0] bg-white shadow-sm" : "hidden"}>
            {/* Collapse button */}
            <div className="flex items-center justify-end border-b border-[#e2e8f0] px-2 py-1">
              <button
                type="button"
                onClick={handleLeftCollapse}
                className="rounded-sm p-1 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#475569]"
                title="Collapse intake form"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <IntakeForm onSubmit={fetchQuotes} onClear={clearQuoteSession} isLoading={isLoading} />
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
          defaultSize={initialSizesRef.current.center}
          minSize={CENTER_MIN}
        >
          <main className="h-full overflow-y-auto p-6">
            {/* Title Section */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-[24px] font-bold text-[#0f172a]">
                  Term Life Quote Engine
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
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-[#64748b]">API STATUS:</span>
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#bbf7d0] bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                  {quoteResponse
                    ? `${eligibleCount} ELIGIBLE`
                    : "READY"}
                </span>
              </div>
            </div>

            {/* Coverage + Term Row */}
            <div className="mb-6 rounded-sm border border-[#e2e8f0] bg-white p-6">
              <div className="flex gap-12">
                {/* Coverage Amount */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#64748b]">
                      Coverage Amount
                    </span>
                    <span className="text-[20px] font-bold text-[#1773cf] tabular-nums">
                      {formatCoverageDisplay(coverageAmount)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <Slider
                      min={0}
                      max={COVERAGE_STEPS.length - 1}
                      step={1}
                      value={[coverageToSlider(coverageAmount)]}
                      onValueChange={([val]) => {
                        if (val !== undefined) {
                          setCoverageAmount(sliderToCoverage(val))
                        }
                      }}
                      className="[&_[data-slot=slider-range]]:bg-[#1773cf] [&_[data-slot=slider-thumb]]:border-[#1773cf] [&_[data-slot=slider-thumb]]:bg-[#1773cf]"
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-[#94a3b8]">
                    <span>$100k</span>
                    <span>$5M</span>
                    <span>$10M</span>
                  </div>
                </div>

                {/* Term Duration */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.5px] text-[#64748b]">
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
                            : "border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f9fafb]"
                        }`}
                      >
                        {term}Y
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Market Comparison */}
            {quoteResponse ? (
              <CarrierResults
                onViewDetails={handleViewDetails}
              />
            ) : (
              <div className="flex h-48 items-center justify-center rounded-sm border border-[#e2e8f0] bg-white">
                <p className="text-[13px] text-[#94a3b8]">
                  Loading quote data...
                </p>
              </div>
            )}
          </main>
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
          <div className={rightOpen ? "flex h-full flex-col overflow-hidden border-l border-[#e2e8f0]" : "hidden"}>
            {/* Collapse button injected above AI panel */}
            <div className="flex items-center justify-start border-b border-[#e2e8f0] bg-white px-2 py-1">
              <button
                type="button"
                onClick={handleRightCollapse}
                className="rounded-sm p-1 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#475569]"
                title="Collapse AI panel"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>
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
      <footer className="flex items-center justify-between border-t border-[#e2e8f0] bg-white px-6 py-2 shadow-[0px_-1px_3px_0px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4 text-[11px] text-[#64748b]">
          <span>
            <kbd className="rounded border border-[#e2e8f0] bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[10px]">
              ESC
            </kbd>{" "}
            Clear All
          </span>
          <span>
            <kbd className="rounded border border-[#e2e8f0] bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[10px]">
              ALT+S
            </kbd>{" "}
            Sync CRM
          </span>
          <span>
            <kbd className="rounded border border-[#e2e8f0] bg-[#f1f5f9] px-1.5 py-0.5 font-mono text-[10px]">
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
