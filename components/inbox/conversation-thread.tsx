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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import type { ConversationPreview } from "@/lib/supabase/inbox"
import type { SmsLogEntry } from "@/lib/supabase/sms"
import type { ActivityLog } from "@/lib/types/activity"

const MAX_SMS_LENGTH = 1600

interface ConversationThreadProps {
  leadId: string | null
  conversation: ConversationPreview | null
  onMessageSent: () => void
}

interface ThreadMessage {
  id: string
  type: "sms" | "activity"
  direction: "inbound" | "outbound" | "system"
  text: string
  timestamp: string
  activityType?: string
}

export function ConversationThread({
  leadId,
  conversation,
  onMessageSent,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadThread = useCallback(async () => {
    if (!leadId) return
    setLoading(true)

    try {
      // Load SMS logs and activities in parallel
      const [smsRes, actRes] = await Promise.all([
        fetch(`/api/sms?leadId=${leadId}`),
        fetch(`/api/activity-log/${leadId}?limit=50`),
      ])

      const smsData = smsRes.ok
        ? ((await smsRes.json()) as { logs: SmsLogEntry[] })
        : { logs: [] }
      const actData = actRes.ok
        ? ((await actRes.json()) as { activities: ActivityLog[] })
        : { activities: [] }

      // Map SMS logs
      const smsMessages: ThreadMessage[] = (smsData.logs ?? []).map((s) => ({
        id: s.id,
        type: "sms" as const,
        direction: s.direction === "outbound" ? "outbound" as const : "inbound" as const,
        text: s.message,
        timestamp: s.createdAt ?? "",
      }))

      // Map communication activities (email, call) — exclude sms_sent to avoid duplication
      const actMessages: ThreadMessage[] = (actData.activities ?? [])
        .filter(
          (a) =>
            a.activityType === "email_sent" ||
            a.activityType === "call",
        )
        .map((a) => ({
          id: a.id,
          type: "activity" as const,
          direction: "system" as const,
          text: a.title,
          timestamp: a.createdAt,
          activityType: a.activityType,
        }))

      // Merge and sort chronologically (oldest first)
      const merged = [...smsMessages, ...actMessages].sort(
        (a, b) => a.timestamp.localeCompare(b.timestamp),
      )

      setMessages(merged)
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      // Wait a tick for ScrollArea to update
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages])

  const handleSend = useCallback(async () => {
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
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "Failed to send SMS")
      }

      toast.success("SMS sent")
      setMessage("")
      void loadThread()
      onMessageSent()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send SMS")
    } finally {
      setSending(false)
    }
  }, [leadId, conversation, message, loadThread, onMessageSent])

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
            <p className="mt-2 text-[12px] text-muted-foreground">
              No messages yet — send an SMS to start.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-4">
            {messages.map((msg) => {
              if (msg.direction === "system") {
                const Icon = msg.activityType === "call" ? Phone : Mail
                return (
                  <div key={msg.id} className="flex items-center justify-center gap-2 py-1">
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
                        isOutbound ? "text-white/70" : "text-muted-foreground"
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

      {/* Compose */}
      <div className="border-t border-border px-4 py-3">
        {!conversation.phone ? (
          <p className="text-center text-[12px] text-muted-foreground">
            No phone number — add one to the lead to send SMS.
          </p>
        ) : (
          <div className="space-y-2">
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
              <span className="text-[10px] text-muted-foreground/70">
                {message.length}/{MAX_SMS_LENGTH}
              </span>
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
        )}
      </div>
    </div>
  )
}
