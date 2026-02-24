"use client"

import { useState, useCallback } from "react"
import {
  FileText,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Copy,
  Mail,
} from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useLeadStore } from "@/lib/store/lead-store"
import { buildQuoteSummary } from "@/lib/utils/quote-summary"
import { toast } from "sonner"
import type { LeadQuoteSnapshot } from "@/lib/types/lead"
import type { CarrierQuote } from "@/lib/types/quote"
import { EmailQuoteDialog } from "@/components/quote/email-quote-dialog"
import { ProposalDialog } from "@/components/quote/proposal-dialog"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCoverage(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
  return `$${(amount / 1000).toFixed(0)}K`
}

function getTopCarrier(quotes: CarrierQuote[]): CarrierQuote | null {
  const eligible = quotes.filter((q) => q.isEligible)
  if (eligible.length === 0) return null
  return eligible.sort((a, b) => b.matchScore - a.matchScore)[0] ?? null
}

/* ------------------------------------------------------------------ */
/*  Quote snapshot card                                                */
/* ------------------------------------------------------------------ */

function QuoteSnapshotCard({
  snapshot,
  onRerun,
  leadId,
  leadName,
  leadEmail,
}: {
  snapshot: LeadQuoteSnapshot
  onRerun: (snapshot: LeadQuoteSnapshot) => void
  leadId: string
  leadName: string
  leadEmail: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)

  const { request, response, createdAt } = snapshot
  const eligibleQuotes = response.quotes.filter((q) => q.isEligible)
  const topCarrier = getTopCarrier(response.quotes)
  const dateStr = format(new Date(createdAt), "MMM d, yyyy")
  const timeStr = format(new Date(createdAt), "h:mm a")

  const handleCopy = useCallback(() => {
    const topCarriers = eligibleQuotes
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3)
    const text = buildQuoteSummary(request, topCarriers)
    void navigator.clipboard.writeText(text)
    toast.success("Quote summary copied")
  }, [request, eligibleQuotes])

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-md border bg-background">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-medium">
                  {dateStr} at {timeStr}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {formatCoverage(request.coverageAmount)} · {request.termLength}yr
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {eligibleQuotes.length} carrier{eligibleQuotes.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {topCarrier && (
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Best: {topCarrier.carrier.name} ${Math.round(topCarrier.monthlyPremium)}/mo
                </p>
              )}
            </div>

            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-3">
            {/* Client params */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Parameters
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                <span>Age: <strong className="text-foreground">{request.age}</strong></span>
                <span>Gender: <strong className="text-foreground">{request.gender}</strong></span>
                <span>State: <strong className="text-foreground">{request.state}</strong></span>
                <span>Tobacco: <strong className="text-foreground">{request.tobaccoStatus}</strong></span>
                {request.medicalConditions && request.medicalConditions.length > 0 && (
                  <span>
                    Conditions: <strong className="text-foreground">{request.medicalConditions.join(", ")}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Top carriers */}
            {eligibleQuotes.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Top Carriers
                </p>
                <div className="mt-1 space-y-1">
                  {eligibleQuotes
                    .sort((a, b) => b.matchScore - a.matchScore)
                    .slice(0, 5)
                    .map((q) => (
                      <div
                        key={q.carrier.id}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <span className="font-medium">{q.carrier.name}</span>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>${Math.round(q.monthlyPremium)}/mo</span>
                          <Badge variant="outline" className="text-[9px]">
                            {q.matchScore}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRerun(snapshot)}
                className="gap-1.5 text-[11px]"
              >
                <RotateCcw className="h-3 w-3" />
                Re-run This Quote
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-[11px]"
              >
                <Copy className="h-3 w-3" />
                Copy Summary
              </Button>
              {leadEmail && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEmailDialogOpen(true)}
                  className="gap-1.5 text-[11px]"
                >
                  <Mail className="h-3 w-3" />
                  Email
                </Button>
              )}
              {eligibleQuotes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setProposalOpen(true)}
                  className="gap-1.5 text-[11px]"
                >
                  <FileText className="h-3 w-3" />
                  Proposal
                </Button>
              )}
            </div>

            {leadEmail && (
              <EmailQuoteDialog
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
                leadId={leadId}
                leadName={leadName}
                leadEmail={leadEmail}
                coverageAmount={request.coverageAmount}
                termLength={request.termLength}
                topCarriers={eligibleQuotes
                  .sort((a, b) => b.matchScore - a.matchScore)
                  .slice(0, 3)}
              />
            )}

            {eligibleQuotes.length > 0 && (
              <ProposalDialog
                open={proposalOpen}
                onOpenChange={setProposalOpen}
                leadId={leadId}
                clientName={leadName}
                coverageAmount={request.coverageAmount}
                termLength={request.termLength}
                carrierIds={eligibleQuotes
                  .sort((a, b) => b.matchScore - a.matchScore)
                  .slice(0, 3)
                  .map((q) => q.carrier.id)}
                carrierNames={eligibleQuotes
                  .sort((a, b) => b.matchScore - a.matchScore)
                  .slice(0, 3)
                  .map((q) => q.carrier.name)}
              />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface QuoteHistoryProps {
  leadId: string
}

export function QuoteHistory({ leadId }: QuoteHistoryProps) {
  const lead = useLeadStore((s) => s.leads.find((l) => l.id === leadId))
  const setIntakeData = useLeadStore((s) => s.setIntakeData)
  const setCoverageAmount = useLeadStore((s) => s.setCoverageAmount)
  const setTermLength = useLeadStore((s) => s.setTermLength)
  const [sectionOpen, setSectionOpen] = useState(true)

  const quoteHistory = lead?.quoteHistory ?? []

  const handleRerun = useCallback(
    (snapshot: LeadQuoteSnapshot) => {
      setIntakeData(snapshot.request)
      setCoverageAmount(snapshot.request.coverageAmount)
      setTermLength(snapshot.request.termLength)
      toast.success("Quote params loaded — click Get Quotes to re-run")
      // Scroll to top where the form is
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
    [setIntakeData, setCoverageAmount, setTermLength],
  )

  if (quoteHistory.length === 0) return null

  return (
    <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
      <div className="border-t border-border bg-background">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50 lg:px-6"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-[13px] font-semibold">
                Quote History
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {quoteHistory.length}
              </Badge>
            </div>
            {sectionOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2 lg:px-6">
            {quoteHistory
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              )
              .map((snapshot) => (
                <QuoteSnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  onRerun={handleRerun}
                  leadId={leadId}
                  leadName={
                    [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
                    "Client"
                  }
                  leadEmail={lead?.email ?? null}
                />
              ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
