"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  StickyNote,
  CalendarClock,
  Activity,
  FileBarChart,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  MessageSquare,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { DatePickerInput } from "@/components/leads/date-picker-input"
import { Button } from "@/components/ui/button"
import { useLeadStore } from "@/lib/store/lead-store"
import { FollowUpScheduler } from "@/components/leads/follow-up-scheduler"
import { ActivityTimeline } from "@/components/leads/activity-timeline"
import { SmsPanel } from "@/components/leads/sms-panel"
import { runPreScreen } from "@/lib/engine/pre-screen"
import type { PreScreenResult, LeadPreScreen } from "@/lib/engine/pre-screen"
import type { MaritalStatus, IncomeRange, LeadQuoteSnapshot } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "domestic_partner", label: "Domestic Partner" },
]

const INCOME_OPTIONS: { value: IncomeRange; label: string }[] = [
  { value: "under_25k", label: "Under $25K" },
  { value: "25k_50k", label: "$25K - $50K" },
  { value: "50k_75k", label: "$50K - $75K" },
  { value: "75k_100k", label: "$75K - $100K" },
  { value: "100k_150k", label: "$100K - $150K" },
  { value: "150k_250k", label: "$150K - $250K" },
  { value: "over_250k", label: "$250K+" },
]

const NOTES_MAX = 5000

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.5px]">
      {children}
    </label>
  )
}

function calculateAgeFromDob(dob: string): number | null {
  const date = new Date(dob)
  if (isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--
  }
  return age
}

/* ------------------------------------------------------------------ */
/*  Collapsible section wrapper                                        */
/* ------------------------------------------------------------------ */

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  defaultExpanded?: boolean
  children: React.ReactNode
  badge?: string | null
}

function CollapsibleSection({
  icon: Icon,
  label,
  defaultExpanded = false,
  children,
  badge,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between py-1"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.5px]">
            {label}
          </span>
          {badge && (
            <span className="rounded-sm bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold text-[#1773cf]">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        )}
      </button>
      {expanded && <div className="mt-2 flex flex-col gap-3">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Lead Details Section                                               */
/* ------------------------------------------------------------------ */

export function LeadDetailsSection() {
  const searchParams = useSearchParams()
  const smsTabActive = searchParams.get("tab") === "sms"
  const smsRef = useRef<HTMLDivElement>(null)

  const activeLead = useLeadStore((s) => s.activeLead)
  const updateActiveLead = useLeadStore((s) => s.updateActiveLead)
  const markFieldDirty = useLeadStore((s) => s.markFieldDirty)

  // Auto-scroll to SMS section when ?tab=sms
  useEffect(() => {
    if (smsTabActive && smsRef.current) {
      setTimeout(() => {
        smsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 200)
    }
  }, [smsTabActive])

  const handleChange = useCallback(
    (field: string, value: string | number | null) => {
      updateActiveLead({ [field]: value })
      markFieldDirty(field)
    },
    [updateActiveLead, markFieldDirty],
  )

  const handleFollowUpSave = useCallback(
    (date: string, note: string | null) => {
      updateActiveLead({ followUpDate: date, followUpNote: note })
      markFieldDirty("followUpDate")
      markFieldDirty("followUpNote")
    },
    [updateActiveLead, markFieldDirty],
  )

  const handleFollowUpClear = useCallback(() => {
    updateActiveLead({ followUpDate: null, followUpNote: null })
    markFieldDirty("followUpDate")
    markFieldDirty("followUpNote")
  }, [updateActiveLead, markFieldDirty])

  if (!activeLead) return null

  const dobAge = activeLead.dateOfBirth
    ? calculateAgeFromDob(activeLead.dateOfBirth)
    : null

  const personalBadge = [
    activeLead.dateOfBirth,
    activeLead.address,
    activeLead.city,
    activeLead.zipCode,
    activeLead.maritalStatus,
  ].filter(Boolean).length > 0
    ? `${[activeLead.dateOfBirth, activeLead.address, activeLead.city, activeLead.zipCode, activeLead.maritalStatus].filter(Boolean).length}/5`
    : null

  const financialBadge = [
    activeLead.occupation,
    activeLead.incomeRange,
    activeLead.dependents != null ? String(activeLead.dependents) : null,
    activeLead.existingCoverage,
  ].filter(Boolean).length > 0
    ? `${[activeLead.occupation, activeLead.incomeRange, activeLead.dependents != null ? String(activeLead.dependents) : null, activeLead.existingCoverage].filter(Boolean).length}/4`
    : null

  return (
    <div className="flex flex-col gap-4 px-6 pb-4">
      <Separator />

      {/* Follow-Up */}
      <CollapsibleSection
        icon={CalendarClock}
        label="Follow-Up"
        defaultExpanded={activeLead.followUpDate !== null}
        badge={activeLead.followUpDate ? "Scheduled" : null}
      >
        <FollowUpScheduler
          followUpDate={activeLead.followUpDate}
          followUpNote={activeLead.followUpNote}
          onSave={handleFollowUpSave}
          onClear={handleFollowUpClear}
        />
      </CollapsibleSection>

      {/* Carrier Pre-Screen */}
      <PreScreenSection />

      {/* Personal Details */}
      <CollapsibleSection
        icon={User}
        label="Personal Details"
        badge={personalBadge}
      >
        {/* Date of Birth */}
        <div>
          <FieldLabel>Date of Birth</FieldLabel>
          <div className="mt-1.5 flex items-center gap-2">
            <DatePickerInput
              value={activeLead.dateOfBirth ?? null}
              onChange={(val) => {
                handleChange("dateOfBirth", val)
                if (val) {
                  const age = calculateAgeFromDob(val)
                  if (age !== null && age >= 0) {
                    updateActiveLead({ age })
                  }
                }
              }}
              className="flex-1"
            />
            {dobAge !== null && (
              <span className="shrink-0 rounded-sm border border-border bg-muted px-2 py-1 text-[11px] font-bold text-[#475569]">
                Age {dobAge}
              </span>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <FieldLabel>Address</FieldLabel>
          <Input
            className="mt-1.5 rounded-sm border-border bg-muted text-[13px] font-medium text-foreground"
            placeholder="Street address"
            value={activeLead.address ?? ""}
            onChange={(e) => handleChange("address", e.target.value || null)}
          />
        </div>

        {/* City + Zip */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>City</FieldLabel>
            <Input
              className="mt-1.5 rounded-sm border-border bg-muted text-[13px] font-medium text-foreground"
              placeholder="City"
              value={activeLead.city ?? ""}
              onChange={(e) => handleChange("city", e.target.value || null)}
            />
          </div>
          <div>
            <FieldLabel>Zip Code</FieldLabel>
            <Input
              className="mt-1.5 rounded-sm border-border bg-muted text-[13px] font-medium text-foreground"
              placeholder="12345"
              value={activeLead.zipCode ?? ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d-]/g, "").slice(0, 10)
                handleChange("zipCode", val || null)
              }}
            />
          </div>
        </div>

        {/* Marital Status */}
        <div>
          <FieldLabel>Marital Status</FieldLabel>
          <Select
            value={activeLead.maritalStatus ?? ""}
            onValueChange={(val) =>
              handleChange("maritalStatus", val || null)
            }
          >
            <SelectTrigger className="mt-1.5 rounded-sm border-border bg-muted text-[13px] font-medium text-foreground">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {MARITAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>

      {/* Financial & Professional */}
      <CollapsibleSection
        icon={Briefcase}
        label="Financial & Professional"
        badge={financialBadge}
      >
        {/* Occupation */}
        <div>
          <FieldLabel>Occupation</FieldLabel>
          <Input
            className="mt-1.5 rounded-sm border-border bg-muted text-[13px] font-medium text-foreground"
            placeholder="Job title"
            value={activeLead.occupation ?? ""}
            onChange={(e) => handleChange("occupation", e.target.value || null)}
          />
        </div>

        {/* Income Range */}
        <div>
          <FieldLabel>Income Range</FieldLabel>
          <Select
            value={activeLead.incomeRange ?? ""}
            onValueChange={(val) =>
              handleChange("incomeRange", val || null)
            }
          >
            <SelectTrigger className="mt-1.5 rounded-sm border-border bg-muted text-[13px] font-medium text-foreground">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {INCOME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dependents */}
        <div>
          <FieldLabel>Dependents</FieldLabel>
          <div className="mt-1.5 flex items-center rounded-sm border border-border bg-muted">
            <button
              type="button"
              className="border-r border-border px-2 py-1 text-[16px] text-muted-foreground hover:bg-muted"
              onClick={() =>
                handleChange(
                  "dependents",
                  Math.max(0, (activeLead.dependents ?? 0) - 1),
                )
              }
            >
              -
            </button>
            <div className="flex-1 text-center text-[14px] font-bold text-foreground tabular-nums">
              {activeLead.dependents ?? 0}
            </div>
            <button
              type="button"
              className="border-l border-border px-2 py-1 text-[16px] text-muted-foreground hover:bg-muted"
              onClick={() =>
                handleChange(
                  "dependents",
                  Math.min(20, (activeLead.dependents ?? 0) + 1),
                )
              }
            >
              +
            </button>
          </div>
        </div>

        {/* Existing Coverage */}
        <div>
          <FieldLabel>Existing Coverage</FieldLabel>
          <Textarea
            className="mt-1.5 min-h-[60px] rounded-sm border-border bg-muted text-[13px] font-medium text-foreground resize-y"
            placeholder="e.g., $200K group through employer"
            value={activeLead.existingCoverage ?? ""}
            onChange={(e) =>
              handleChange("existingCoverage", e.target.value || null)
            }
          />
        </div>
      </CollapsibleSection>

      {/* Notes */}
      <CollapsibleSection
        icon={StickyNote}
        label="Notes"
        badge={activeLead.notes ? "Has notes" : null}
      >
        <div>
          <Textarea
            className="min-h-[100px] rounded-sm border-border bg-muted text-[13px] font-medium text-foreground resize-y"
            placeholder="Agent notes about this lead..."
            maxLength={NOTES_MAX}
            value={activeLead.notes ?? ""}
            onChange={(e) => handleChange("notes", e.target.value || null)}
          />
          <div className="mt-1 text-right text-[10px] text-muted-foreground/70">
            {(activeLead.notes ?? "").length}/{NOTES_MAX}
          </div>
        </div>
      </CollapsibleSection>

      {/* SMS */}
      <div ref={smsRef}>
        <CollapsibleSection
          icon={MessageSquare}
          label="Text Messages"
          defaultExpanded={smsTabActive}
          badge={activeLead.phone ? null : "No phone"}
        >
          <SmsPanel leadId={activeLead.id} lead={activeLead} />
        </CollapsibleSection>
      </div>

      {/* Quote History */}
      {activeLead.quoteHistory.length > 0 && (
        <CollapsibleSection
          icon={FileBarChart}
          label="Quote History"
          badge={`${activeLead.quoteHistory.length}`}
        >
          <div className="space-y-2">
            {[...activeLead.quoteHistory]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((snapshot) => (
                <QuoteHistoryCard key={snapshot.id} snapshot={snapshot} />
              ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Activity Timeline */}
      <CollapsibleSection
        icon={Activity}
        label="Activity"
      >
        <ActivityTimeline
          leadId={activeLead.id}
          onCallClick={() => {
            document.getElementById("call-history-section")?.scrollIntoView({ behavior: "smooth" })
          }}
        />
      </CollapsibleSection>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Carrier Pre-Screen Section                                         */
/* ------------------------------------------------------------------ */

const STATUS_ICONS: Record<PreScreenResult["status"], { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  eligible: { icon: CheckCircle2, color: "text-green-600" },
  flagged: { icon: AlertTriangle, color: "text-amber-600" },
  likely_decline: { icon: XCircle, color: "text-red-500" },
  unknown: { icon: HelpCircle, color: "text-gray-400" },
}

const STATUS_LABELS: Record<PreScreenResult["status"], string> = {
  eligible: "Eligible",
  flagged: "Flagged",
  likely_decline: "Likely Decline",
  unknown: "Unknown",
}

function PreScreenSection() {
  const activeLead = useLeadStore((s) => s.activeLead)
  const updateActiveLead = useLeadStore((s) => s.updateActiveLead)
  const markFieldDirty = useLeadStore((s) => s.markFieldDirty)
  const [expandedCarrier, setExpandedCarrier] = useState<string | null>(null)

  if (!activeLead) return null

  const preScreen = activeLead.preScreen as LeadPreScreen | null

  const handleRefresh = useCallback(() => {
    if (!activeLead) return
    const result = runPreScreen({
      leadId: activeLead.id,
      state: activeLead.state,
      age: activeLead.age,
      gender: activeLead.gender,
      coverageAmount: activeLead.coverageAmount,
      termLength: activeLead.termLength,
      tobaccoStatus: activeLead.tobaccoStatus,
      medicalConditions: activeLead.medicalConditions,
      duiHistory: activeLead.duiHistory,
      yearsSinceLastDui: activeLead.yearsSinceLastDui,
    })
    updateActiveLead({ preScreen: result })
    markFieldDirty("preScreen")
  }, [activeLead, updateActiveLead, markFieldDirty])

  const screenedAgo = preScreen
    ? relativeTimeShort(preScreen.screenedAt)
    : null

  return (
    <CollapsibleSection
      icon={ShieldCheck}
      label="Carrier Pre-Screen"
      badge={preScreen ? `${preScreen.eligible} eligible` : null}
    >
      {!preScreen ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-[11px] text-muted-foreground">
            No pre-screen data yet
          </p>
          <Button
            variant="outline"
            size="sm"
            className="text-[11px]"
            onClick={handleRefresh}
          >
            <ShieldCheck className="mr-1 h-3 w-3" />
            Run Pre-Screen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Summary line */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[11px]">
              <span className="font-medium text-green-600">
                {preScreen.eligible} eligible
              </span>
              <span className="font-medium text-amber-600">
                {preScreen.flagged} flagged
              </span>
              <span className="font-medium text-red-500">
                {preScreen.likelyDecline} decline
              </span>
            </div>
            <div className="flex items-center gap-2">
              {screenedAgo && (
                <span className="text-[10px] text-muted-foreground">
                  {screenedAgo}
                </span>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Refresh pre-screen"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Carrier rows */}
          <div className="space-y-1">
            {preScreen.results.map((result) => {
              const { icon: StatusIcon, color } = STATUS_ICONS[result.status]
              const isExpanded = expandedCarrier === result.carrierId
              const primaryReason = result.reasons[0] ?? ""

              return (
                <div key={result.carrierId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-muted"
                    onClick={() =>
                      setExpandedCarrier(
                        isExpanded ? null : result.carrierId,
                      )
                    }
                  >
                    <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                    <span className="flex-1 truncate text-[12px] font-medium">
                      {result.carrierName}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {STATUS_LABELS[result.status]}
                    </span>
                    {result.reasons.length > 1 && (
                      <ChevronDown
                        className={`h-3 w-3 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Expanded reasons */}
                  {isExpanded && result.reasons.length > 0 && (
                    <div className="ml-6 mt-0.5 space-y-0.5 pb-1">
                      {result.reasons.map((reason, idx) => (
                        <p
                          key={idx}
                          className="text-[10px] text-muted-foreground"
                        >
                          {reason}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Show primary reason inline if not expanded */}
                  {!isExpanded &&
                    primaryReason &&
                    result.status !== "eligible" && (
                      <p className="ml-6 text-[10px] text-muted-foreground truncate">
                        {primaryReason}
                      </p>
                    )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
}

function relativeTimeShort(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

/* ------------------------------------------------------------------ */
/*  Quote History Card                                                 */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatCoverage(amount: number): string {
  if (amount >= 1_000_000) return `$${amount / 1_000_000}M`
  return `$${amount / 1_000}K`
}

function QuoteHistoryCard({ snapshot }: { snapshot: LeadQuoteSnapshot }) {
  const date = new Date(snapshot.createdAt)
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  const { request, response } = snapshot
  const eligible = response.quotes.filter((q) => q.isEligible)
  const topCarriers = [...eligible]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3)

  return (
    <div className="rounded-md border border-border bg-muted p-3">
      {/* Header: date + coverage + term */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {dateStr} at {timeStr}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold text-[#1773cf]">
            {formatCoverage(request.coverageAmount)}
          </span>
          <span className="rounded-sm bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold text-[#1773cf]">
            {request.termLength}Y
          </span>
          <span className="text-[10px] text-muted-foreground/70">
            {response.eligibleCount}/{response.totalCarriersChecked} eligible
          </span>
        </div>
      </div>

      {/* Top 3 carriers */}
      {topCarriers.length > 0 && (
        <div className="mt-2 space-y-1">
          {topCarriers.map((q, idx) => (
            <div
              key={q.productCode ? `${q.carrier.id}:${q.productCode}` : q.carrier.id}
              className="flex items-center justify-between text-[12px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-muted-foreground/70 w-3">
                  {idx + 1}.
                </span>
                <span className="font-medium text-foreground truncate">
                  {q.carrier.name}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {q.matchScore}/99
                </span>
              </div>
              <span className="font-medium text-foreground tabular-nums shrink-0 ml-2">
                {formatCurrency(q.monthlyPremium)}/mo
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
