"use client"

import { useState, useTransition } from "react"
import { Mail, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendQuoteEmail } from "@/lib/actions/send-quote-email"
import type { CarrierQuote } from "@/lib/types/quote"

/* ------------------------------------------------------------------ */
/*  Email Quote Dialog                                                 */
/*  Pre-fills recipient from lead, shows carrier preview, sends email  */
/* ------------------------------------------------------------------ */

interface EmailQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadName: string
  leadEmail: string | null
  coverageAmount: number
  termLength: number
  topCarriers: CarrierQuote[]
}

export function EmailQuoteDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadEmail,
  coverageAmount,
  termLength,
  topCarriers,
}: EmailQuoteDialogProps) {
  const [email, setEmail] = useState(leadEmail ?? "")
  const [isPending, startTransition] = useTransition()

  const carriers = topCarriers.slice(0, 3)
  const canSend = email.includes("@") && carriers.length > 0

  function handleSend() {
    if (!canSend) return

    startTransition(async () => {
      const result = await sendQuoteEmail({
        leadId,
        recipientEmail: email,
        recipientName: leadName,
        coverageAmount,
        termLength,
        topCarriers: carriers,
      })

      if (result.success) {
        toast.success("Quote summary sent!")
        onOpenChange(false)
      } else {
        toast.error(result.error ?? "Failed to send email")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Quote Summary
          </DialogTitle>
          <DialogDescription>
            Send a branded quote summary with the top {carriers.length} carrier
            {carriers.length !== 1 ? "s" : ""} to your client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="quote-email-recipient">Recipient Email</Label>
            <Input
              id="quote-email-recipient"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Carrier preview */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Carriers Included
            </p>
            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
              {carriers.map((q) => (
                <div
                  key={q.carrier.id}
                  className="flex items-center justify-between text-[13px]"
                >
                  <span className="font-medium">{q.carrier.name}</span>
                  <span className="text-muted-foreground">
                    ${Math.round(q.monthlyPremium)}/mo
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend || isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
