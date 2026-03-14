"use client"

import { useState, useCallback } from "react"
import { FileText, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useFeatureGate } from "@/lib/billing/use-feature-gate"
import { UpgradePromptInline } from "@/lib/billing/feature-gate"

interface ProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  clientName: string
  coverageAmount: number
  termLength: number
  carrierIds: string[]
  carrierNames: string[]
}

export function ProposalDialog({
  open,
  onOpenChange,
  leadId,
  clientName,
  coverageAmount,
  termLength,
  carrierIds,
  carrierNames,
}: ProposalDialogProps) {
  const canGenerate = useFeatureGate("pdf_proposals")
  const [includeRecommendation, setIncludeRecommendation] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = useCallback(async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          carrierIds,
          includeRecommendation,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? "Failed to generate proposal")
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download =
        res.headers
          .get("content-disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "proposal.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Proposal downloaded")
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate proposal",
      )
    } finally {
      setIsGenerating(false)
    }
  }, [leadId, carrierIds, includeRecommendation, onOpenChange])

  const formatCoverage =
    coverageAmount >= 1_000_000
      ? `$${(coverageAmount / 1_000_000).toFixed(1)}M`
      : `$${(coverageAmount / 1_000).toFixed(0)}K`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Proposal
          </DialogTitle>
          <DialogDescription>
            Create a branded PDF proposal for your client.
          </DialogDescription>
        </DialogHeader>

        {!canGenerate ? (
          <div className="pt-2">
            <UpgradePromptInline feature="pdf_proposals" />
          </div>
        ) : (
        <div className="space-y-4 pt-2">
          {/* Summary */}
          <div className="rounded-md border border-border bg-muted p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{clientName}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Coverage</span>
              <span className="font-medium">
                {formatCoverage} · {termLength}-Year Term
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Carriers</span>
              <span className="font-medium text-right">
                {carrierNames.join(", ")}
              </span>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-recommendation"
              checked={includeRecommendation}
              onCheckedChange={(checked) =>
                setIncludeRecommendation(checked === true)
              }
            />
            <label
              htmlFor="include-recommendation"
              className="text-[12px] text-muted-foreground cursor-pointer"
            >
              Include recommendation section
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
