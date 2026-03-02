"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  Shield,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  HeartPulse,
  Copy,
  Check,
  Pill,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import {
  checkMedicalEligibility,
  checkStructuredMedicalEligibility,
  checkPrescriptionScreening,
  checkCombinationDeclines,
} from "@/lib/engine/eligibility"
import type {
  MedicalDecision,
  MedicalConditionRule,
  LivingBenefitRider,
  LivingBenefitsDetail,
} from "@/lib/types"
import { checkBuildChart, type BuildChartResult } from "@/lib/engine/build-chart"
import { MEDICAL_CONDITIONS } from "@/lib/data/medical-conditions"
import { useCommissionStore } from "@/lib/store/commission-store"
import { useLeadStore } from "@/lib/store/lead-store"
import { calculateCommission } from "@/lib/engine/commission-calc"
import { buildSingleCarrierSummary } from "@/lib/utils/quote-summary"
import type { CarrierQuote, Gender } from "@/lib/types"

export interface BuildInput {
  heightFeet: number
  heightInches: number
  weight: number
  gender: Gender
}

interface CarrierDetailModalProps {
  quote: CarrierQuote | null
  open: boolean
  onOpenChange: (open: boolean) => void
  clientConditions?: string[]
  buildInput?: BuildInput
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}

function StatusIcon({ status }: { status: "ok" | "warn" | "no" | "unknown" }) {
  switch (status) {
    case "ok":
      return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
    case "warn":
      return <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
    case "no":
      return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
    case "unknown":
      return <HelpCircle className="h-4 w-4 text-gray-400 shrink-0" />
  }
}

function TobaccoRow({
  label,
  rule,
}: {
  label: string
  rule: string
}) {
  const isNonTobacco = rule.toLowerCase().includes("non-smoker") || rule.toLowerCase().includes("non-tobacco")
  const isTobacco = rule.toLowerCase().includes("tobacco rates") && !isNonTobacco
  const status = isNonTobacco ? "ok" : isTobacco ? "warn" : "ok"

  return (
    <div className="flex items-center gap-2 py-1.5">
      <StatusIcon status={status} />
      <span className="text-sm min-w-[100px] text-muted-foreground">{label}</span>
      <span className="text-sm">{rule}</span>
    </div>
  )
}

const DECISION_STYLES: Record<
  MedicalDecision,
  { bg: string; text: string; label: string }
> = {
  DECLINE: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", label: "Decline" },
  CONDITIONAL: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", label: "Conditional" },
  MODIFIED: { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", label: "Modified" },
  REVIEW: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", label: "Review" },
  ACCEPT: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", label: "Accept" },
  STANDARD: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", label: "Standard" },
}

function DecisionBadge({ decision }: { decision: MedicalDecision }) {
  const style = DECISION_STYLES[decision]
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

function MedicalConditionsTable({ conditions }: { conditions: MedicalConditionRule[] }) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? conditions.filter((c) =>
        c.condition.toLowerCase().includes(search.toLowerCase()),
      )
    : conditions

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Medical Conditions Database</h4>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search conditions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
      <ScrollArea className="h-[280px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] font-bold w-[35%]">Condition</TableHead>
              <TableHead className="text-[10px] font-bold w-[15%]">Decision</TableHead>
              <TableHead className="text-[10px] font-bold w-[15%]">Lookback</TableHead>
              <TableHead className="text-[10px] font-bold w-[35%]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                  {search ? "No conditions match your search" : "No condition data available"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((mc, i) => (
                <TableRow key={`${mc.condition}-${i}`}>
                  <TableCell className="text-xs font-medium py-1.5">{mc.condition}</TableCell>
                  <TableCell className="py-1.5">
                    <DecisionBadge decision={mc.decision} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">
                    {mc.lookbackMonths ? `${mc.lookbackMonths}mo` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5 max-w-[200px] truncate">
                    {mc.notes ?? mc.conditions ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <p className="text-[10px] text-muted-foreground mt-1">
        {filtered.length} of {conditions.length} conditions shown
      </p>
    </div>
  )
}

function PrescriptionScreeningSection({
  medications,
}: {
  medications: { name: string; action: string; associatedCondition: string | null; notes: string | null }[]
}) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? medications.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()),
      )
    : medications

  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
        <Pill className="h-4 w-4 text-amber-500" />
        Prescription Screening Database
      </h4>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search medications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
      <ScrollArea className="h-[200px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] font-bold w-[30%]">Medication</TableHead>
              <TableHead className="text-[10px] font-bold w-[15%]">Action</TableHead>
              <TableHead className="text-[10px] font-bold w-[25%]">Condition</TableHead>
              <TableHead className="text-[10px] font-bold w-[30%]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                  {search ? "No medications match your search" : "No prescription data"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((med, i) => (
                <TableRow key={`${med.name}-${i}`}>
                  <TableCell className="text-xs font-medium py-1.5">{med.name}</TableCell>
                  <TableCell className="py-1.5">
                    <span
                      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
                        med.action === "DECLINE"
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                      }`}
                    >
                      {med.action === "DECLINE" ? "Decline" : "Review"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5">
                    {med.associatedCondition ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground py-1.5 max-w-[180px] truncate">
                    {med.notes ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <p className="text-[10px] text-muted-foreground mt-1">
        {filtered.length} of {medications.length} exclusions shown
      </p>
    </div>
  )
}

function RiderRow({
  label,
  rider,
}: {
  label: string
  rider: LivingBenefitRider
}) {
  if (!rider.available) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">{label}: Not available</span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground pl-6">
        {rider.type && <span>Type: {rider.type}</span>}
        {rider.trigger && <span>Trigger: {rider.trigger}</span>}
        {rider.maxPercent != null && <span>Max: {rider.maxPercent}%</span>}
        {rider.maxAmount != null && (
          <span>Max Amount: ${rider.maxAmount.toLocaleString()}</span>
        )}
        {rider.cost && <span>Cost: {rider.cost}</span>}
        {rider.notes && (
          <span className="col-span-2 mt-0.5">{rider.notes}</span>
        )}
      </div>
    </div>
  )
}

function LivingBenefitsStructured({
  detail,
  fallback,
}: {
  detail: LivingBenefitsDetail
  fallback: string
}) {
  const hasAnyRider =
    detail.terminalIllness || detail.criticalIllness || detail.chronicIllness

  if (!hasAnyRider) {
    return fallback && fallback !== "None specified" ? (
      <div>
        <h4 className="text-sm font-semibold mb-2">Living Benefits</h4>
        <p className="text-sm">{fallback}</p>
      </div>
    ) : null
  }

  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
        <HeartPulse className="h-4 w-4 text-[#e11d48]" />
        Living Benefits
      </h4>
      <div className="space-y-2">
        {detail.terminalIllness && (
          <RiderRow label="Terminal Illness" rider={detail.terminalIllness} />
        )}
        {detail.criticalIllness && (
          <RiderRow label="Critical Illness" rider={detail.criticalIllness} />
        )}
        {detail.chronicIllness && (
          <RiderRow label="Chronic Illness" rider={detail.chronicIllness} />
        )}
        {detail.accidentalDeathBenefit?.available && (
          <div className="rounded-lg border p-3 space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm font-medium">Accidental Death Benefit</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground pl-6">
              {detail.accidentalDeathBenefit.issueAges && (
                <span>Ages: {detail.accidentalDeathBenefit.issueAges}</span>
              )}
              {detail.accidentalDeathBenefit.maxAmount != null && (
                <span>Max: ${detail.accidentalDeathBenefit.maxAmount.toLocaleString()}</span>
              )}
              {detail.accidentalDeathBenefit.notes && (
                <span className="col-span-2 mt-0.5">{detail.accidentalDeathBenefit.notes}</span>
              )}
            </div>
          </div>
        )}
        {detail.otherRiders && detail.otherRiders.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Other Riders</span>
            {detail.otherRiders.map((rider, i) => (
              <div key={`${rider.name}-${i}`} className="flex items-start gap-2 text-xs py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{rider.name}</span>
                  {rider.cost && <span className="text-muted-foreground"> — {rider.cost}</span>}
                  {rider.description && (
                    <p className="text-muted-foreground">{rider.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {detail.notes && (
          <p className="text-xs text-muted-foreground mt-1">{detail.notes}</p>
        )}
      </div>
    </div>
  )
}

function PricingTab({ quote }: { quote: CarrierQuote }) {
  const getCommissionRates = useCommissionStore((s) => s.getCommissionRates)
  const rates = getCommissionRates(quote.carrier.id)
  const commission = calculateCommission(
    quote.annualPremium,
    rates.firstYearPercent,
    rates.renewalPercent,
  )
  const hasCommission = commission.firstYear > 0

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground italic leading-relaxed">
        These rates are estimates based on the information provided. Final premium will be determined
        during the carrier&apos;s underwriting process and may differ based on health history, lab results,
        and other factors.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(quote.monthlyPremium)}</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Annual</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(quote.annualPremium)}</p>
        </div>
      </div>

      {hasCommission && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2">Your Commission</h4>
            <div className="divide-y">
              <InfoRow
                label="First Year"
                value={`${formatCurrency(commission.firstYear)} (${rates.firstYearPercent}%)`}
              />
              <InfoRow
                label="Annual Renewal"
                value={`${formatCurrency(commission.renewal)} (${rates.renewalPercent}%)`}
              />
              <InfoRow
                label="5-Year Total"
                value={formatCurrency(commission.fiveYearTotal)}
              />
            </div>
          </div>
        </>
      )}

      {quote.carrier.livingBenefits && quote.carrier.livingBenefits !== "None specified" && (
        <>
          <Separator />
          <div className="flex items-start gap-3 rounded-lg border border-[#fecdd3] bg-[#fff1f2] p-3">
            <HeartPulse className="h-4 w-4 text-[#e11d48] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#881337]">Living Benefits Included</p>
              <p className="text-sm text-[#9f1239]">{quote.carrier.livingBenefits}</p>
            </div>
          </div>
        </>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Key Features</h4>
        <ul className="space-y-1.5">
          {quote.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-2">Product Details</h4>
        <div className="divide-y">
          <InfoRow label="Product" value={quote.product.name} />
          <InfoRow label="Type" value={quote.product.type} />
          <InfoRow label="Age Range" value={quote.product.ageRange} />
          <InfoRow label="Face Amount" value={quote.product.faceAmountRange} />
          {quote.product.conversionAge && (
            <InfoRow
              label="Convertible Until"
              value={`Age ${quote.product.conversionAge}`}
            />
          )}
          <InfoRow
            label="Return of Premium"
            value={quote.product.hasROP ? "Available" : "Not Available"}
          />
          {quote.product.gradedPeriod && (
            <InfoRow label="Graded Period" value={quote.product.gradedPeriod} />
          )}
        </div>
      </div>
    </div>
  )
}

function BuildChartSection({
  quote,
  buildInput,
}: {
  quote: CarrierQuote
  buildInput: BuildInput
}) {
  const result = checkBuildChart(
    quote.carrier.id,
    buildInput.gender,
    buildInput.heightFeet,
    buildInput.heightInches,
    buildInput.weight,
  )

  const statusLabel =
    result.rateClassImpact === "preferred"
      ? "Within Preferred Limits"
      : result.rateClassImpact === "standard"
        ? "Standard Rate Class"
        : result.rateClassImpact === "decline"
          ? "Exceeds Limits"
          : "No Build Chart Data"

  const status: "ok" | "warn" | "no" =
    result.rateClassImpact === "preferred"
      ? "ok"
      : result.rateClassImpact === "standard"
        ? "warn"
        : result.rateClassImpact === "decline"
          ? "no"
          : "ok"

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">Build Chart (Height/Weight)</h4>
      <div className="rounded-lg border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <span className="text-sm font-medium">{statusLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 text-sm text-muted-foreground">
          <span>Height: {buildInput.heightFeet}&apos;{buildInput.heightInches}&quot;</span>
          <span>Weight: {buildInput.weight} lbs</span>
          <span>BMI: {result.bmi}</span>
          {result.carrierNote && (
            <span className="col-span-2 text-xs mt-1">{result.carrierNote}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function UnderwritingTab({
  quote,
  clientConditions = [],
  buildInput,
}: {
  quote: CarrierQuote
  clientConditions?: string[]
  buildInput?: BuildInput
}) {
  const { tobacco, dui, medicalHighlights } = quote.carrier

  const hasStructuredMedical =
    quote.carrier.medicalConditions && quote.carrier.medicalConditions.length > 0

  // Enhanced medical checks — structured when available, legacy fallback
  const structuredMedicalResults =
    clientConditions.length > 0
      ? checkStructuredMedicalEligibility(quote.carrier, clientConditions)
      : []

  // Legacy medical results (always computed for backward compat display)
  const legacyMedicalResults =
    clientConditions.length > 0
      ? checkMedicalEligibility(quote.carrier, clientConditions)
      : []

  // Combination decline alerts
  const comboAlerts = checkCombinationDeclines(quote.carrier, clientConditions)

  const decisionStatusMap: Record<MedicalDecision, "ok" | "warn" | "no" | "unknown"> = {
    ACCEPT: "ok",
    STANDARD: "ok",
    CONDITIONAL: "warn",
    MODIFIED: "warn",
    REVIEW: "warn",
    DECLINE: "no",
  }

  const legacyStatusMap: Record<string, "ok" | "warn" | "no" | "unknown"> = {
    accepted: "ok",
    review: "warn",
    declined: "no",
    unknown: "unknown",
  }

  return (
    <div className="space-y-5">
      {tobacco.keyNote && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">Key Differentiator</span>
          </div>
          <p className="text-sm text-amber-800">{tobacco.keyNote}</p>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Tobacco / Nicotine Rules</h4>
        <div className="space-y-0.5">
          <TobaccoRow label="Cigarettes" rule={tobacco.cigarettes} />
          <TobaccoRow label="Cigars" rule={tobacco.cigars} />
          <TobaccoRow label="Vaping" rule={tobacco.vaping} />
          <TobaccoRow label="Smokeless" rule={tobacco.smokeless} />
          <TobaccoRow label="NRT/Pouches" rule={tobacco.nrt} />
          <TobaccoRow label="Marijuana" rule={tobacco.marijuana} />
          <TobaccoRow label="Quit Lookback" rule={tobacco.quitLookback} />
        </div>
      </div>

      <Separator />

      {dui && (
        <>
          <div>
            <h4 className="text-sm font-semibold mb-2">DUI / Driving Rules</h4>
            <div className="rounded-lg border p-3 space-y-1">
              <InfoRow label="Rule" value={dui.rule} />
              <InfoRow label="Result" value={dui.result} />
              {dui.lookbackYears != null && (
                <InfoRow label="Lookback" value={`${dui.lookbackYears} years`} />
              )}
              {dui.flatExtra && <InfoRow label="Flat Extra" value={dui.flatExtra} />}
              {dui.specialRules && <InfoRow label="Special Rules" value={dui.specialRules} />}
            </div>
          </div>
          <Separator />
        </>
      )}

      {buildInput && (
        <>
          <BuildChartSection quote={quote} buildInput={buildInput} />
          <Separator />
        </>
      )}

      {/* Client medication flags (from existing coaching system) */}
      {quote.medicationFlags && quote.medicationFlags.length > 0 && (
        <>
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
              <Pill className="h-4 w-4 text-amber-500" />
              Prescription Drug Screening
            </h4>
            <div className="space-y-1.5">
              {quote.medicationFlags.map((flag) => (
                <div
                  key={`${flag.medication}-${flag.action}`}
                  className="flex items-center gap-2 py-1.5"
                >
                  {flag.action === "decline" ? (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <span className="text-sm min-w-[140px] font-medium capitalize">
                    {flag.medication}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {flag.condition}{flag.detail ? ` — ${flag.detail}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Combination decline alerts */}
      {comboAlerts.length > 0 && (
        <>
          <div>
            <h4 className="text-sm font-semibold mb-2 text-red-600">
              Combination Decline Alerts
            </h4>
            <div className="space-y-2">
              {comboAlerts.map((alert, i) => (
                <div
                  key={`combo-${i}`}
                  className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {alert.decision}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 pl-6">
                    Triggered by: {alert.matchedConditions.join(" + ")}
                  </p>
                  {alert.notes && (
                    <p className="text-xs text-red-500 dark:text-red-400 pl-6 mt-0.5">
                      {alert.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Client's conditions — structured results */}
      {structuredMedicalResults.length > 0 && hasStructuredMedical && (
        <>
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Medical Eligibility (Client&apos;s Conditions)
            </h4>
            <div className="space-y-1.5">
              {structuredMedicalResults.map((result) => (
                <div
                  key={result.conditionId}
                  className="flex items-start gap-2 py-1.5"
                >
                  <StatusIcon
                    status={
                      result.decision
                        ? decisionStatusMap[result.decision]
                        : "unknown"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {result.conditionLabel}
                      </span>
                      {result.decision && <DecisionBadge decision={result.decision} />}
                      {result.lookbackMonths != null && (
                        <span className="text-[10px] text-muted-foreground">
                          {result.lookbackMonths}mo lookback
                        </span>
                      )}
                    </div>
                    {result.rateClass && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Rate class: {result.rateClass}
                      </p>
                    )}
                    {result.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Client's conditions — legacy fallback (only when no structured data) */}
      {legacyMedicalResults.length > 0 && !hasStructuredMedical && (
        <>
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Medical Eligibility (Client&apos;s Conditions)
            </h4>
            <div className="space-y-1.5">
              {legacyMedicalResults.map((result) => {
                const condition = MEDICAL_CONDITIONS.find(
                  (c) => c.id === result.conditionId,
                )
                return (
                  <div
                    key={result.conditionId}
                    className="flex items-center gap-2 py-1.5"
                  >
                    <StatusIcon status={legacyStatusMap[result.status] ?? "unknown"} />
                    <span className="text-sm min-w-[140px] font-medium">
                      {condition?.label ?? result.conditionId}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {result.carrierRule ?? "No carrier data available"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Structured living benefits */}
      {quote.carrier.livingBenefitsDetail && (
        <>
          <LivingBenefitsStructured
            detail={quote.carrier.livingBenefitsDetail}
            fallback={quote.carrier.livingBenefits}
          />
          <Separator />
        </>
      )}

      {/* Legacy living benefits fallback (only when no structured detail) */}
      {!quote.carrier.livingBenefitsDetail &&
        quote.carrier.livingBenefits &&
        quote.carrier.livingBenefits !== "None specified" && (
          <>
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                <HeartPulse className="h-4 w-4 text-[#e11d48]" />
                Living Benefits
              </h4>
              <p className="text-sm">{quote.carrier.livingBenefits}</p>
            </div>
            <Separator />
          </>
        )}

      {/* Full medical conditions database (searchable, structured) */}
      {hasStructuredMedical && (
        <>
          <MedicalConditionsTable conditions={quote.carrier.medicalConditions!} />
          <Separator />
        </>
      )}

      {/* Prescription exclusion database (searchable, structured) */}
      {quote.carrier.prescriptionExclusions?.medications &&
        quote.carrier.prescriptionExclusions.medications.length > 0 && (
          <>
            <PrescriptionScreeningSection
              medications={quote.carrier.prescriptionExclusions.medications}
            />
            <Separator />
          </>
        )}

      {/* Combination declines reference (full list) */}
      {quote.carrier.combinationDeclines &&
        quote.carrier.combinationDeclines.length > 0 && (
          <>
            <div>
              <h4 className="text-sm font-semibold mb-2">Combination Decline Rules</h4>
              <div className="space-y-1.5">
                {quote.carrier.combinationDeclines.map((combo, i) => (
                  <div
                    key={`combo-ref-${i}`}
                    className="flex items-start gap-2 py-1.5 text-xs"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">
                        {combo.conditions.join(" + ")}
                      </span>
                      <span className="text-muted-foreground"> — {combo.decision}</span>
                      {combo.notes && (
                        <p className="text-muted-foreground mt-0.5">{combo.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

      {/* Legacy medical highlights (always shown as reference) */}
      {Object.keys(medicalHighlights).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Medical Highlights</h4>
          <div className="divide-y">
            {Object.entries(medicalHighlights).map(([condition, rule]) => (
              <InfoRow key={condition} label={condition} value={rule} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CompanyTab({ quote }: { quote: CarrierQuote }) {
  const { carrier } = quote
  const currentYear = new Date().getFullYear()
  const yearsInBusiness = currentYear - carrier.yearFounded

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: carrier.color }}
        >
          {carrier.abbr}
        </div>
        <div>
          <h3 className="font-semibold">{carrier.name}</h3>
          <p className="text-sm text-muted-foreground">
            Founded {carrier.yearFounded} ({yearsInBusiness} years)
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-2">AM Best Rating</h4>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-sm">
            {carrier.amBest}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {carrier.amBestLabel}
          </span>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-2">Operational Details</h4>
        <div className="divide-y">
          <InfoRow
            label="E-Sign"
            value={
              carrier.operational.eSign
                ? carrier.operational.eSignNote ?? "Available"
                : carrier.operational.eSignNote ?? "Not Available"
            }
          />
          {carrier.operational.telesales !== undefined && (
            <InfoRow
              label="Telesales"
              value={String(carrier.operational.telesales)}
            />
          )}
          {carrier.operational.phoneInterview && (
            <InfoRow
              label="Phone Interview"
              value={carrier.operational.phoneInterview}
            />
          )}
          {carrier.operational.payments && (
            <InfoRow label="Payments" value={carrier.operational.payments} />
          )}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-semibold mb-2">State Availability</h4>
        {carrier.statesNotAvailable.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Available in all 50 states + DC
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Not available in:
            </p>
            <div className="flex flex-wrap gap-1">
              {carrier.statesNotAvailable.map((st) => (
                <Badge key={st} variant="outline" className="text-xs">
                  {st}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {carrier.livingBenefits && carrier.livingBenefits !== "None specified" && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2">Living Benefits</h4>
            <p className="text-sm">{carrier.livingBenefits}</p>
          </div>
        </>
      )}
    </div>
  )
}

export function CarrierDetailModal({
  quote,
  open,
  onOpenChange,
  clientConditions = [],
  buildInput,
}: CarrierDetailModalProps) {
  const [copied, setCopied] = useState(false)
  const coverageAmount = useLeadStore((s) => s.intakeData?.coverageAmount ?? 0)
  const termLength = useLeadStore((s) => s.intakeData?.termLength ?? 0)

  const handleCopyCarrier = useCallback(async () => {
    if (!quote || coverageAmount === 0) return
    const text = buildSingleCarrierSummary(quote, coverageAmount, termLength)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Carrier quote copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy — try again")
    }
  }, [quote, coverageAmount, termLength])

  if (!quote) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded text-[10px] font-bold text-white"
              style={{ backgroundColor: quote.carrier.color }}
            >
              {quote.carrier.abbr}
            </div>
            {quote.carrier.name}
            {quote.isBestValue && (
              <Badge className="bg-green-600 text-white">BEST VALUE</Badge>
            )}
            <button
              type="button"
              onClick={handleCopyCarrier}
              className="ml-auto flex items-center gap-1 rounded-md border border-[#e2e8f0] px-2.5 py-1.5 text-[11px] font-medium text-[#64748b] transition-colors hover:bg-[#f9fafb] hover:text-[#1773cf]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#16a34a]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pricing" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pricing" className="text-xs">
              <DollarSign className="mr-1 h-3 w-3" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="underwriting" className="text-xs">
              <Shield className="mr-1 h-3 w-3" />
              Underwriting
            </TabsTrigger>
            <TabsTrigger value="company" className="text-xs">
              <Building2 className="mr-1 h-3 w-3" />
              Company
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="mt-4">
            <PricingTab quote={quote} />
          </TabsContent>

          <TabsContent value="underwriting" className="mt-4">
            <UnderwritingTab quote={quote} clientConditions={clientConditions} buildInput={buildInput} />
          </TabsContent>

          <TabsContent value="company" className="mt-4">
            <CompanyTab quote={quote} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
