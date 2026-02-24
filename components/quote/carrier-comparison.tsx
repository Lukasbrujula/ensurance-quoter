"use client"

import { useState } from "react"
import { GitCompareArrows, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ProposalDialog } from "./proposal-dialog"
import type { CarrierQuote } from "@/lib/types"

interface CarrierComparisonProps {
  selectedQuotes: CarrierQuote[]
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId?: string
  clientName?: string
  coverageAmount?: number
  termLength?: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface ComparisonRow {
  label: string
  getValue: (quote: CarrierQuote) => string
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Monthly Premium",
    getValue: (q) => formatCurrency(q.monthlyPremium),
  },
  {
    label: "Annual Premium",
    getValue: (q) => formatCurrency(q.annualPremium),
  },
  {
    label: "Match Score",
    getValue: (q) => `${q.matchScore}/99`,
  },
  {
    label: "AM Best Rating",
    getValue: (q) => `${q.carrier.amBest} (${q.carrier.amBestLabel})`,
  },
  {
    label: "Product",
    getValue: (q) => q.product.name,
  },
  {
    label: "Age Range",
    getValue: (q) => q.product.ageRange,
  },
  {
    label: "Face Amount",
    getValue: (q) => q.product.faceAmountRange,
  },
  {
    label: "Conversion Age",
    getValue: (q) =>
      q.product.conversionAge ? `Age ${q.product.conversionAge}` : "N/A",
  },
  {
    label: "Return of Premium",
    getValue: (q) => (q.product.hasROP ? "Yes" : "No"),
  },
  {
    label: "E-Sign",
    getValue: (q) => {
      if (!q.carrier.operational.eSign) return "No"
      return q.carrier.operational.eSignNote ?? "Yes"
    },
  },
  {
    label: "Living Benefits",
    getValue: (q) => q.carrier.livingBenefits,
  },
  {
    label: "Tobacco Key Note",
    getValue: (q) => q.carrier.tobacco.keyNote,
  },
  {
    label: "Vaping Policy",
    getValue: (q) => q.carrier.tobacco.vaping,
  },
  {
    label: "Quit Lookback",
    getValue: (q) => q.carrier.tobacco.quitLookback,
  },
  {
    label: "DUI Policy",
    getValue: (q) =>
      q.carrier.dui
        ? `${q.carrier.dui.rule} → ${q.carrier.dui.result}`
        : "No specific DUI policy listed",
  },
  {
    label: "States Not Available",
    getValue: (q) =>
      q.carrier.statesNotAvailable.length === 0
        ? "All states"
        : q.carrier.statesNotAvailable.join(", "),
  },
]

function CompareFloatingButton({
  count,
  onClick,
}: {
  count: number
  onClick: () => void
}) {
  if (count < 2) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <Button onClick={onClick} size="lg" className="shadow-lg">
        <GitCompareArrows className="mr-2 h-4 w-4" />
        Compare Selected ({count})
      </Button>
    </div>
  )
}

function ComparisonSheet({
  selectedQuotes,
  open,
  onOpenChange,
  leadId,
  clientName,
  coverageAmount,
  termLength,
}: CarrierComparisonProps) {
  const [proposalOpen, setProposalOpen] = useState(false)

  const canGenerateProposal =
    leadId && clientName && coverageAmount && termLength && selectedQuotes.length >= 2

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <GitCompareArrows className="h-5 w-5" />
              Carrier Comparison
            </SheetTitle>
            {canGenerateProposal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProposalOpen(true)}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Generate Proposal
              </Button>
            )}
          </div>
        </SheetHeader>

        {canGenerateProposal && (
          <ProposalDialog
            open={proposalOpen}
            onOpenChange={setProposalOpen}
            leadId={leadId}
            clientName={clientName}
            coverageAmount={coverageAmount}
            termLength={termLength}
            carrierIds={selectedQuotes.map((q) => q.carrier.id)}
            carrierNames={selectedQuotes.map((q) => q.carrier.name)}
          />
        )}

        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Feature</TableHead>
                {selectedQuotes.map((quote) => (
                  <TableHead key={quote.carrier.id} className="text-center min-w-[140px]">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: quote.carrier.color }}
                      >
                        {quote.carrier.abbr}
                      </div>
                      <span className="text-xs font-medium">
                        {quote.carrier.name}
                      </span>
                      {quote.isBestValue && (
                        <Badge className="bg-green-600 text-white text-[9px] px-1 py-0">
                          BEST VALUE
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {COMPARISON_ROWS.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="text-sm font-medium text-muted-foreground">
                    {row.label}
                  </TableCell>
                  {selectedQuotes.map((quote) => (
                    <TableCell
                      key={quote.carrier.id}
                      className="text-center text-sm"
                    >
                      {row.getValue(quote)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              <TableRow>
                <TableCell />
                {selectedQuotes.map((quote) => (
                  <TableCell key={quote.carrier.id} className="text-center">
                    <Button size="sm" className="w-full">
                      Apply Now
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { CompareFloatingButton, ComparisonSheet }
