"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Send,
  Clock,
  Calculator,
  CalendarDays,
  FileText,
  Loader2,
  MessageSquare,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useUser } from "@clerk/nextjs"
import { SMS_TEMPLATES, resolveTemplate } from "@/lib/data/sms-templates"
import type { SmsLogEntry } from "@/lib/supabase/sms"
import type { Lead } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Template icon mapping                                              */
/* ------------------------------------------------------------------ */

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  clock: Clock,
  calculator: Calculator,
  calendar: CalendarDays,
  file: FileText,
}

/* ------------------------------------------------------------------ */
/*  Message character limit                                            */
/* ------------------------------------------------------------------ */

const MAX_SMS_LENGTH = 1600

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCoverage(amount: number | null | undefined): string {
  if (!amount) return ""
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
  return `$${(amount / 1000).toFixed(0)}K`
}

function relativeTime(isoDate: string | null): string {
  if (!isoDate) return ""
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/* ------------------------------------------------------------------ */
/*  SMS Panel                                                          */
/* ------------------------------------------------------------------ */

interface SmsPanelProps {
  leadId: string
  lead: Lead
}

export function SmsPanel({ leadId, lead }: SmsPanelProps) {
  const { user } = useUser()
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<SmsLogEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const phone = lead.phone
  const agentName = user?.fullName ?? user?.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "Agent"

  // Template variable context
  const templateVars = {
    firstName: lead.firstName,
    agent: agentName,
    coverage: formatCoverage(lead.coverageAmount) || undefined,
    time: lead.followUpDate
      ? new Date(lead.followUpDate).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : undefined,
    carrierName: lead.quoteHistory[0]?.response.quotes
      .filter((q) => q.isEligible)
      .sort((a, b) => b.matchScore - a.matchScore)[0]?.carrier.name ?? undefined,
  }

  /* ---- Load SMS history ---- */
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/sms?leadId=${leadId}`)
      if (!res.ok) return
      const data = (await res.json()) as { logs: SmsLogEntry[] }
      setHistory(data.logs ?? [])
    } catch {
      // Non-critical
    } finally {
      setLoadingHistory(false)
    }
  }, [leadId])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  /* ---- Template selection ---- */
  const handleTemplateClick = useCallback(
    (template: string) => {
      setMessage(resolveTemplate(template, templateVars))
    },
    [templateVars],
  )

  /* ---- Send SMS ---- */
  const handleSend = useCallback(async () => {
    if (!phone || !message.trim()) return

    setSending(true)
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          message: message.trim(),
          leadId,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "Failed to send SMS")
      }

      toast.success("SMS sent successfully")
      setMessage("")
      void loadHistory() // Refresh history
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send SMS")
    } finally {
      setSending(false)
    }
  }, [phone, message, leadId, loadHistory])

  /* ---- No phone number state ---- */
  if (!phone) {
    return (
      <div className="flex flex-col items-center gap-2 py-6">
        <Phone className="h-5 w-5 text-muted-foreground/50" />
        <p className="text-[12px] text-muted-foreground text-center">
          Add a phone number to send texts
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Quick Templates */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Quick Templates
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SMS_TEMPLATES.map((tpl) => {
            const Icon = TEMPLATE_ICONS[tpl.icon] ?? MessageSquare
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleTemplateClick(tpl.template)}
                className="flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <Icon className="h-3 w-3" />
                {tpl.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Compose */}
      <div>
        <Textarea
          className="min-h-[80px] rounded-sm border-border bg-muted text-[13px] font-medium text-foreground resize-y"
          placeholder={`Message to ${lead.firstName || phone}...`}
          maxLength={MAX_SMS_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/70">
            {message.length}/{MAX_SMS_LENGTH}
          </span>
          <Button
            size="sm"
            disabled={!message.trim() || sending}
            onClick={handleSend}
            className="gap-1.5 text-[11px]"
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Send SMS
          </Button>
        </div>
      </div>

      {/* SMS History */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Message History
        </p>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-muted-foreground/70">
            No messages yet
          </p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {history.map((sms) => (
              <div
                key={sms.id}
                className={`rounded-md border p-2.5 ${
                  sms.direction === "outbound"
                    ? "border-blue-200 bg-blue-50/50 ml-4"
                    : "border-border bg-muted mr-4"
                }`}
              >
                <p className="text-[12px] text-foreground whitespace-pre-wrap break-words">
                  {sms.message}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {sms.direction === "outbound" ? "Sent" : "Received"} to {sms.toNumber}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {relativeTime(sms.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
