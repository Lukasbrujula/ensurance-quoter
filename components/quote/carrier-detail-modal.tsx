"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DollarSign,
  Shield,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  HeartPulse,
} from "lucide-react"
import { checkMedicalEligibility } from "@/lib/engine/eligibility"
import { checkBuildChart, type BuildChartResult } from "@/lib/engine/build-chart"
import { MEDICAL_CONDITIONS } from "@/lib/data/medical-conditions"
import { useCommissionStore } from "@/lib/store/commission-store"
import { calculateCommission } from "@/lib/engine/commission-calc"
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

  const medicalResults =
    clientConditions.length > 0
      ? checkMedicalEligibility(quote.carrier, clientConditions)
      : []

  const statusMap: Record<string, "ok" | "warn" | "no" | "unknown"> = {
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

      {medicalResults.length > 0 && (
        <>
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Medical Eligibility (Client&apos;s Conditions)
            </h4>
            <div className="space-y-1.5">
              {medicalResults.map((result) => {
                const condition = MEDICAL_CONDITIONS.find(
                  (c) => c.id === result.conditionId,
                )
                return (
                  <div
                    key={result.conditionId}
                    className="flex items-center gap-2 py-1.5"
                  >
                    <StatusIcon status={statusMap[result.status] ?? "unknown"} />
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
