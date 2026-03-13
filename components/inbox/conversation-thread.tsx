"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  Send,
  Loader2,
  MessageSquare,
  ExternalLink,
  Phone,
  Mail,
  FileText,
  PhoneOff,
  AlertTriangle,
  MailX,
  MailPlus,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { SMS_TEMPLATES, resolveTemplate } from "@/lib/data/sms-templates"
import { formatPhoneDisplay } from "@/lib/utils/phone"
import type { ConversationPreview } from "@/lib/supabase/inbox"
import type { Lead } from "@/lib/types/lead"
import type { SmsLogEntry } from "@/lib/supabase/sms"
import type { ActivityLog } from "@/lib/types/activity"

const MAX_SMS_LENGTH = 1600
const MESSAGE_POLL_INTERVAL = 15_000 // 15 seconds

type ComposeChannel = "sms" | "email"

interface ConversationThreadProps {
  leadId: string | null
  conversation: ConversationPreview | null
  lead: Lead | null
  onMessageSent: () => void
  primaryNumber?: string | null
  emailConnected?: boolean
  gmailAddress?: string | null
}

interface ThreadMessage {
  id: string
  type: "sms" | "email" | "activity"
  direction: "inbound" | "outbound" | "system"
  text: string
  timestamp: string
  activityType?: string
  details?: Record<string, unknown> | null
  subject?: string
}

interface EmailLogEntry {
  id: string
  direction: string
  subject: string | null
  bodySnippet: string | null
  bodyHtml: string | null
  createdAt: string
}

export function ConversationThread({
  leadId,
  conversation,
  lead,
  onMessageSent,
  primaryNumber,
  emailConnected = false,
  gmailAddress,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [composeChannel, setComposeChannel] = useState<ComposeChannel>("sms")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailTo, setEmailTo] = useState("")
  const [emailCc, setEmailCc] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const markedReadRef = useRef<string | null>(null)

  // Mark conversation as read when opened
  useEffect(() => {
    if (!leadId || markedReadRef.current === leadId) return

    markedReadRef.current = leadId

    void fetch("/api/inbox/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, action: "read" }),
    }).catch(() => {
      // Non-critical
    })
  }, [leadId])

  // Set email "To" from lead data
  useEffect(() => {
    if (lead?.email) {
      setEmailTo(lead.email)
    }
  }, [lead?.email])

  // Sync Gmail when opening a conversation (if connected and lead has email)
  const syncedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!leadId || !emailConnected || !lead?.email) return
    if (syncedRef.current === leadId) return
    syncedRef.current = leadId

    void fetch("/api/email/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, leadEmail: lead.email }),
    }).catch(() => {
      // Non-critical — emails will appear on next poll
    })
  }, [leadId, emailConnected, lead?.email])

  const loadThread = useCallback(async () => {
    if (!leadId) return

    // Only show spinner on initial load, not on polls
    if (messages.length === 0) {
      setLoading(true)
    }

    try {
      // Load SMS logs, email logs, and activities in parallel
      const [smsRes, emailRes, actRes] = await Promise.all([
        fetch(`/api/sms?leadId=${leadId}`),
        emailConnected ? fetch(`/api/email?leadId=${leadId}`) : Promise.resolve(null),
        fetch(`/api/activity-log/${leadId}?limit=50`),
      ])

      const smsData = smsRes.ok
        ? ((await smsRes.json()) as { logs: SmsLogEntry[] })
        : { logs: [] }
      const emailData = emailRes?.ok
        ? ((await emailRes.json()) as { logs: EmailLogEntry[] })
        : { logs: [] }
      const actData = actRes.ok
        ? ((await actRes.json()) as { activities: ActivityLog[] })
        : { activities: [] }

      // Map SMS logs
      const smsMessages: ThreadMessage[] = (smsData.logs ?? []).map((s) => ({
        id: s.id,
        type: "sms" as const,
        direction:
          s.direction === "outbound"
            ? ("outbound" as const)
            : ("inbound" as const),
        text: s.message,
        timestamp: s.createdAt ?? "",
      }))

      // Map email logs
      const emailMessages: ThreadMessage[] = (emailData.logs ?? []).map((e) => ({
        id: e.id,
        type: "email" as const,
        direction:
          e.direction === "outbound"
            ? ("outbound" as const)
            : ("inbound" as const),
        text: e.bodySnippet ?? e.subject ?? "",
        timestamp: e.createdAt ?? "",
        subject: e.subject ?? undefined,
      }))

      // Map communication activities (call only — email_sent excluded to avoid duplication with email_logs)
      const actMessages: ThreadMessage[] = (actData.activities ?? [])
        .filter(
          (a) => a.activityType === "call",
        )
        .map((a) => {
          const isAiAgent = a.details?.handled_by === "ai_agent"
          return {
            id: a.id,
            type: "activity" as const,
            direction: "system" as const,
            text: a.title,
            timestamp: a.createdAt,
            activityType: isAiAgent ? "ai_agent_call" : a.activityType,
            details: a.details,
          }
        })

      // Merge and sort chronologically (oldest first)
      const merged = [...smsMessages, ...emailMessages, ...actMessages].sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
      )

      setMessages(merged)
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

  // Poll for new messages every 15s when a conversation is selected
  useEffect(() => {
    if (!leadId) return

    pollRef.current = setInterval(() => {
      void loadThread()
    }, MESSAGE_POLL_INTERVAL)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [leadId, loadThread])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages])

  const handleSendSms = useCallback(async () => {
    if (!leadId || !conversation?.phone || !message.trim()) return

    setSending(true)
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: conversation.phone,
          message: message.trim(),
          leadId,
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? "Failed to send SMS")
      }

      toast.success("SMS sent")
      setMessage("")
      void loadThread()
      onMessageSent()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send SMS",
      )
    } finally {
      setSending(false)
    }
  }, [leadId, conversation, message, loadThread, onMessageSent])

  const handleSendEmail = useCallback(async () => {
    if (!leadId || !emailTo.trim() || !emailSubject.trim() || !message.trim()) return

    setSending(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          to: emailTo.trim(),
          cc: emailCc.trim() || undefined,
          subject: emailSubject.trim(),
          body: message.trim(),
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? "Failed to send email")
      }

      toast.success("Email sent")
      setMessage("")
      setEmailSubject("")
      setEmailCc("")
      void loadThread()
      onMessageSent()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send email",
      )
    } finally {
      setSending(false)
    }
  }, [leadId, emailTo, emailCc, emailSubject, message, loadThread, onMessageSent])

  const handleSend = useCallback(async () => {
    if (composeChannel === "email") {
      await handleSendEmail()
    } else {
      await handleSendSms()
    }
  }, [composeChannel, handleSendEmail, handleSendSms])

  const handleTemplateSelect = useCallback(
    (template: string) => {
      const resolved = resolveTemplate(template, {
        firstName: lead?.firstName,
        agent: null,
        coverage: lead?.coverageAmount
          ? `$${lead.coverageAmount.toLocaleString()}`
          : null,
        time: null,
        carrierName: null,
      })
      setMessage(resolved)
      setShowTemplates(false)
    },
    [lead],
  )

  if (!leadId || !conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/20">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
        <p className="mt-2 text-[13px] text-muted-foreground">
          Select a conversation to view
        </p>
      </div>
    )
  }

  const hasPhone = Boolean(conversation.phone)
  const hasEmail = Boolean(conversation.email)

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <p className="text-[14px] font-semibold">{conversation.leadName}</p>
          <p className="text-[11px] text-muted-foreground">
            {conversation.phone ?? conversation.email ?? "No contact"}
          </p>
        </div>
        <Link
          href={`/leads/${leadId}`}
          className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium text-[#1773cf] transition-colors hover:bg-[#eff6ff]"
        >
          <ExternalLink className="h-3 w-3" />
          Open Lead
        </Link>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-[13px] font-medium text-muted-foreground">
              Start a conversation
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {hasPhone
                ? "Send your first message below."
                : "Add a phone number to this lead to send SMS."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            {messages.map((msg) => {
              if (msg.direction === "system") {
                // AI agent calls get a richer card
                if (msg.activityType === "ai_agent_call") {
                  const reason = msg.details?.reason as string | null
                  const durationSec = msg.details?.duration_seconds as number | null
                  const durationStr = durationSec
                    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
                    : null

                  return (
                    <div
                      key={msg.id}
                      className="flex items-center justify-center py-2"
                    >
                      <div className="w-full max-w-[85%] rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/30">
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-violet-600" />
                          <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
                            AI Agent handled call
                          </span>
                          {durationStr && (
                            <span className="text-[10px] text-violet-500">
                              ({durationStr})
                            </span>
                          )}
                        </div>
                        {reason && (
                          <p className="mt-0.5 text-[11px] text-violet-600/80 dark:text-violet-400/80">
                            {reason}
                          </p>
                        )}
                        <p className="mt-1 text-[9px] text-violet-400 dark:text-violet-500">
                          {msg.timestamp
                            ? formatDistanceToNow(new Date(msg.timestamp), {
                                addSuffix: true,
                              })
                            : ""}
                        </p>
                      </div>
                    </div>
                  )
                }

                // Standard system markers (calls, emails)
                const Icon =
                  msg.activityType === "call" ? Phone : Mail
                return (
                  <div
                    key={msg.id}
                    className="flex items-center justify-center gap-2 py-1"
                  >
                    <div className="h-px flex-1 bg-border" />
                    <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {msg.text}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )
              }

              const isOutbound = msg.direction === "outbound"

              // Email message card
              if (msg.type === "email") {
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg border px-3 py-2 ${
                        isOutbound
                          ? "border-[#1773cf]/30 bg-[#1773cf]/5"
                          : "border-border bg-muted/50"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {isOutbound ? "Sent email" : "Received email"}
                        </span>
                      </div>
                      {msg.subject && (
                        <p className="text-[12px] font-semibold text-foreground">
                          {msg.subject}
                        </p>
                      )}
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-[12px] text-muted-foreground">
                        {msg.text}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {msg.timestamp
                          ? formatDistanceToNow(new Date(msg.timestamp), {
                              addSuffix: true,
                            })
                          : ""}
                      </p>
                    </div>
                  </div>
                )
              }

              // SMS bubble
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isOutbound
                        ? "bg-[#1773cf] text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-[13px]">
                      {msg.text}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isOutbound
                          ? "text-white/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {msg.timestamp
                        ? formatDistanceToNow(new Date(msg.timestamp), {
                            addSuffix: true,
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

      {/* Compose — always visible */}
      <div className="border-t border-border px-4 py-3">
        {/* Channel toggle */}
        <div className="mb-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setComposeChannel("sms")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              composeChannel === "sms"
                ? "bg-[#1773cf]/10 text-[#1773cf]"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <MessageSquare className="h-3 w-3" />
            SMS
          </button>
          <button
            type="button"
            onClick={() => setComposeChannel("email")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              composeChannel === "email"
                ? "bg-[#1773cf]/10 text-[#1773cf]"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Mail className="h-3 w-3" />
            Email
          </button>
        </div>

        {composeChannel === "email" ? (
          /* Email compose */
          !emailConnected ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6">
              <MailX className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-center text-[12px] text-muted-foreground">
                Connect your email to send and receive emails from the inbox.
              </p>
              <Link
                href="/settings/integrations"
                className="flex items-center gap-1 rounded-md bg-[#1773cf] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#1565b8]"
              >
                <MailPlus className="h-3 w-3" />
                Connect Email
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="To"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="h-8 text-[12px]"
                />
                <Input
                  placeholder="CC (optional)"
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  className="h-8 w-1/3 text-[12px]"
                />
              </div>
              <Input
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="h-8 text-[12px]"
              />
              <Textarea
                className="min-h-[80px] rounded-sm border-border bg-muted text-[13px] resize-none"
                placeholder="Write your email..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="flex items-center justify-between">
                {gmailAddress && (
                  <span className="text-[10px] text-muted-foreground/50">
                    Sending from {gmailAddress}
                  </span>
                )}
                <Button
                  size="sm"
                  disabled={!emailTo.trim() || !emailSubject.trim() || !message.trim() || sending}
                  onClick={() => void handleSend()}
                  className="gap-1.5 text-[11px]"
                >
                  {sending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Send Email
                </Button>
              </div>
            </div>
          )
        ) : (
          /* SMS compose */
          !hasPhone ? (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2.5">
              <PhoneOff className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              <p className="text-[12px] text-muted-foreground">
                No phone number on file.{" "}
                <Link
                  href={`/leads/${leadId}`}
                  className="font-medium text-[#1773cf] hover:underline"
                >
                  Add one to send SMS
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* No from number warning */}
              {!primaryNumber && !process.env.NEXT_PUBLIC_TELNYX_CALLER_NUMBER && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <p className="text-[11px] text-amber-800">
                    No sending number configured.{" "}
                    <Link
                      href="/settings/phone-numbers"
                      className="font-medium underline"
                    >
                      Purchase one in Settings
                    </Link>
                  </p>
                </div>
              )}

              {/* Template picker */}
              {showTemplates && (
                <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-muted/30 p-2">
                  {SMS_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleTemplateSelect(tmpl.template)}
                      className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              )}

              <Textarea
                className="min-h-[60px] rounded-sm border-border bg-muted text-[13px] resize-none"
                placeholder={`Message ${conversation.leadName}...`}
                maxLength={MAX_SMS_LENGTH}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend()
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplates((p) => !p)}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      showTemplates
                        ? "bg-[#1773cf]/10 text-[#1773cf]"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <FileText className="h-3 w-3" />
                    Templates
                  </button>
                  <span className="text-[10px] text-muted-foreground/70">
                    {message.length}/{MAX_SMS_LENGTH}
                  </span>
                  {primaryNumber && (
                    <span className="text-[10px] text-muted-foreground/50">
                      Sending from {formatPhoneDisplay(primaryNumber)}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={!message.trim() || sending}
                  onClick={() => void handleSend()}
                  className="gap-1.5 text-[11px]"
                >
                  {sending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
