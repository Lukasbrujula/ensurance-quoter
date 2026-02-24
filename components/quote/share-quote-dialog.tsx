"use client"

import { useState, useTransition, useCallback } from "react"
import { Mail, MessageSquare, Loader2, Send } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { sendQuoteEmail } from "@/lib/actions/send-quote-email"
import { buildQuoteSummary } from "@/lib/utils/quote-summary"
import type { CarrierQuote } from "@/lib/types/quote"
import type { QuoteRequest } from "@/lib/types/quote"

/* ------------------------------------------------------------------ */
/*  Share Quote Dialog — Email + SMS tabs                               */
/* ------------------------------------------------------------------ */

interface ShareQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadName: string
  leadEmail: string | null
  leadPhone: string | null
  coverageAmount: number
  termLength: number
  topCarriers: CarrierQuote[]
  intakeData: QuoteRequest | null
}

export function ShareQuoteDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadEmail,
  leadPhone,
  coverageAmount,
  termLength,
  topCarriers,
  intakeData,
}: ShareQuoteDialogProps) {
  const [tab, setTab] = useState<string>(leadEmail ? "email" : "sms")
  const [email, setEmail] = useState(leadEmail ?? "")
  const [isEmailPending, startEmailTransition] = useTransition()

  // SMS state
  const defaultSmsBody = intakeData
    ? buildQuoteSummary(intakeData, topCarriers.slice(0, 3))
    : ""
  const [smsPhone, setSmsPhone] = useState(leadPhone ?? "")
  const [smsMessage, setSmsMessage] = useState(defaultSmsBody)
  const [isSmsSending, setIsSmsSending] = useState(false)

  const carriers = topCarriers.slice(0, 3)
  const canSendEmail = email.includes("@") && carriers.length > 0
  const canSendSms = smsPhone.replace(/\D/g, "").length >= 10 && smsMessage.trim().length > 0

  const smsSegments = Math.ceil(smsMessage.length / 160) || 1

  const handleSendEmail = useCallback(() => {
    if (!canSendEmail) return
    startEmailTransition(async () => {
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
  }, [canSendEmail, leadId, email, leadName, coverageAmount, termLength, carriers, onOpenChange])

  const handleSendSms = useCallback(async () => {
    if (!canSendSms) return
    setIsSmsSending(true)
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: smsPhone,
          message: smsMessage.trim(),
          leadId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to send SMS" })) as { error?: string }
        toast.error(data.error ?? "Failed to send SMS")
        return
      }
      toast.success("SMS sent!")
      onOpenChange(false)
    } catch {
      toast.error("Failed to send SMS")
    } finally {
      setIsSmsSending(false)
    }
  }, [canSendSms, smsPhone, smsMessage, leadId, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Share Quote
          </DialogTitle>
          <DialogDescription>
            Send a quote summary to your client via email or text message.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="gap-1.5 text-[12px]">
              <Mail className="h-3.5 w-3.5" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5 text-[12px]">
              <MessageSquare className="h-3.5 w-3.5" />
              SMS
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="share-email-recipient">Recipient Email</Label>
              <Input
                id="share-email-recipient"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isEmailPending}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={!canSendEmail || isEmailPending}>
                {isEmailPending ? (
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
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="share-sms-phone">Phone Number</Label>
              <Input
                id="share-sms-phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-sms-message">Message</Label>
              <Textarea
                id="share-sms-message"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={6}
                maxLength={1600}
                className="text-[12px] leading-relaxed"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{smsMessage.length} / 1600 characters</span>
                <span>{smsSegments} segment{smsSegments !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSmsSending}>
                Cancel
              </Button>
              <Button onClick={() => void handleSendSms()} disabled={!canSendSms || isSmsSending}>
                {isSmsSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send SMS
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
