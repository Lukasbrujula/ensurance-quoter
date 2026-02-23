"use client"

import { useState, useEffect } from "react"
import { Bot, User, RefreshCw, MessageSquare } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { AiTranscriptRow } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Transcript Viewer — chat-style layout                              */
/* ------------------------------------------------------------------ */

interface TranscriptViewerProps {
  callId: string
  agentId: string
}

export function TranscriptViewer({ callId, agentId }: TranscriptViewerProps) {
  const [messages, setMessages] = useState<AiTranscriptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchTranscript() {
      try {
        const res = await fetch(
          `/api/agents/${agentId}/transcripts/${callId}`,
        )
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        if (!cancelled) {
          setMessages(data.messages ?? [])
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchTranscript()
    return () => {
      cancelled = true
    }
  }, [callId, agentId])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="ml-auto h-8 w-2/3" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-xs text-muted-foreground">
        Could not load transcript for this call.
      </p>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Transcript not available for this call</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Transcript</p>
      <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
        {messages.map((msg) => (
          <TranscriptMessage key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Individual message                                                 */
/* ------------------------------------------------------------------ */

function TranscriptMessage({ message }: { message: AiTranscriptRow }) {
  const isAssistant = message.role === "assistant"
  const isSystem = message.role === "system"

  if (isSystem) {
    return (
      <div className="text-center">
        <span className="text-[10px] text-muted-foreground italic">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div
      className={`flex gap-2 ${isAssistant ? "justify-start" : "flex-row-reverse"}`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isAssistant
            ? "bg-violet-100 dark:bg-violet-900/30"
            : "bg-blue-100 dark:bg-blue-900/30"
        }`}
      >
        {isAssistant ? (
          <Bot className="h-3 w-3 text-violet-600 dark:text-violet-400" />
        ) : (
          <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${
          isAssistant
            ? "bg-muted text-foreground"
            : "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100"
        }`}
      >
        <p>{message.content}</p>
        {message.timestamp && (
          <p className="mt-0.5 text-[10px] opacity-60">
            {formatTimestamp(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return ts
  }
}
