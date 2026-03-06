"use client"

import { useState, useEffect, useCallback } from "react"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  UserPlus,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { AgentCallDetailRow } from "@/lib/supabase/calls"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CallDetailPanelProps {
  agentId: string
  callId: string
  onClose: () => void
}

/* ------------------------------------------------------------------ */
/*  Human-friendly field labels                                        */
/* ------------------------------------------------------------------ */

const FIELD_LABELS: Record<string, string> = {
  caller_name: "Name",
  callback_number: "Callback Number",
  phone: "Phone",
  reason: "Reason for Call",
  callback_time: "Preferred Callback",
  email: "Email",
  date_of_birth: "Date of Birth",
  state: "State",
}

function humanizeFieldName(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  // Convert snake_case/camelCase to Title Case
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "0:00"
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${String(sec).padStart(2, "0")}`
}

/* ------------------------------------------------------------------ */
/*  Extraction status badge                                            */
/* ------------------------------------------------------------------ */

function ExtractionStatusBadge({ status }: { status: string | null }) {
  if (status === "completed" || status === "success") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      >
        <Check className="h-3 w-3" />
        Extracted
      </Badge>
    )
  }

  if (status === "partial") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      >
        <AlertTriangle className="h-3 w-3" />
        Partial
      </Badge>
    )
  }

  if (status === "failed") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      >
        <X className="h-3 w-3" />
        Failed
      </Badge>
    )
  }

  if (status === "pending" || status === "processing") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    )
  }

  return null
}

/* ------------------------------------------------------------------ */
/*  Extraction warning banner                                          */
/* ------------------------------------------------------------------ */

function ExtractionWarningBanner({
  status,
  extractedData,
}: {
  status: string | null
  extractedData: Record<string, unknown> | null
}) {
  if (status !== "failed" && status !== "partial") return null

  const isFailed = status === "failed"

  // Find missing fields (null values in extracted data)
  const missingFields: string[] = []
  if (extractedData) {
    for (const [key, value] of Object.entries(extractedData)) {
      if (value === null || value === undefined || value === "") {
        missingFields.push(humanizeFieldName(key))
      }
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        isFailed
          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
          : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
      )}
    >
      <AlertTriangle
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          isFailed
            ? "text-red-600 dark:text-red-400"
            : "text-amber-600 dark:text-amber-400",
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            isFailed
              ? "text-red-800 dark:text-red-300"
              : "text-amber-800 dark:text-amber-300",
          )}
        >
          {isFailed
            ? "Extraction failed. Please review the transcript manually."
            : "Some information could not be extracted. Please review the transcript."}
        </p>
        {missingFields.length > 0 && (
          <p
            className={cn(
              "mt-1 text-xs",
              isFailed
                ? "text-red-700/80 dark:text-red-400/80"
                : "text-amber-700/80 dark:text-amber-400/80",
            )}
          >
            Missing: {missingFields.join(", ")}
          </p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Transcript viewer                                                  */
/* ------------------------------------------------------------------ */

function TranscriptViewer({
  transcriptData,
  transcriptText,
}: {
  transcriptData: AgentCallDetailRow["transcript_data"]
  transcriptText: string | null
}) {
  // Speaker-segmented transcript
  if (transcriptData && transcriptData.length > 0) {
    return (
      <div className="space-y-2">
        {transcriptData.map((entry, i) => {
          const isAgent = entry.role === "assistant" || entry.role === "system"
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                isAgent
                  ? "border-l-2 border-primary/40 bg-muted/50"
                  : "border-l-2 border-blue-400/40 bg-blue-50/50 dark:bg-blue-950/20",
              )}
            >
              <p
                className={cn(
                  "mb-0.5 text-[11px] font-medium uppercase tracking-wider",
                  isAgent
                    ? "text-primary/60"
                    : "text-blue-600/70 dark:text-blue-400/70",
                )}
              >
                {isAgent ? "Agent" : "Caller"}
              </p>
              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {entry.content}
              </p>
            </div>
          )
        })}
      </div>
    )
  }

  // Plain text fallback
  if (transcriptText) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {transcriptText}
        </p>
      </div>
    )
  }

  // No transcript
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm text-muted-foreground">
        No transcript available for this call.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Extracted variables grid                                           */
/* ------------------------------------------------------------------ */

function ExtractedDataGrid({
  data,
}: {
  data: Record<string, unknown> | null
}) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No data was extracted from this call.
      </p>
    )
  }

  const entries = Object.entries(data)

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => {
        const displayValue =
          value === null || value === undefined || value === ""
            ? null
            : String(value)

        return (
          <div
            key={key}
            className="flex flex-col gap-0.5 rounded-md border bg-muted/20 px-3 py-2"
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {humanizeFieldName(key)}
            </span>
            <span
              className={cn(
                "text-sm",
                displayValue
                  ? "text-foreground"
                  : "text-muted-foreground/50 italic",
              )}
            >
              {displayValue ?? "\u2014"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CallDetailPanel({
  agentId,
  callId,
  onClose,
}: CallDetailPanelProps) {
  const [detail, setDetail] = useState<AgentCallDetailRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [handled, setHandled] = useState(false)

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/calls/${callId}`)
      if (!res.ok) throw new Error("Failed to load call detail")
      const data = await res.json()
      setDetail(data.call)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [agentId, callId])

  useEffect(() => {
    void fetchDetail()
  }, [fetchDetail])

  if (loading) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gap-1.5 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Button>
        <DetailSkeleton />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gap-1.5 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </Button>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {error ?? "Call not found"}
          </p>
          <Button variant="ghost" size="sm" onClick={fetchDetail} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const isInbound = detail.direction === "inbound"
  const DirectionIcon = isInbound ? PhoneIncoming : PhoneOutgoing

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="gap-1.5 -ml-2 text-muted-foreground cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to list
      </Button>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isInbound
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
          )}
        >
          <DirectionIcon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold truncate">
              {detail.caller_name ?? "Unknown Caller"}
            </h3>
            <ExtractionStatusBadge status={detail.extraction_status} />
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {detail.caller_phone && (
              <span className="flex items-center gap-1 font-mono">
                <Phone className="h-3 w-3" />
                {detail.caller_phone}
              </span>
            )}
            {detail.started_at && (
              <span>{formatDateTime(detail.started_at)}</span>
            )}
            {detail.duration_seconds !== null && detail.duration_seconds > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(detail.duration_seconds)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Extraction warning */}
      <ExtractionWarningBanner
        status={detail.extraction_status}
        extractedData={detail.extracted_data}
      />

      {/* Quick actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {detail.caller_phone && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            asChild
          >
            <a href={`tel:${detail.caller_phone}`}>
              <Phone className="h-3.5 w-3.5" />
              Call Back
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 cursor-pointer"
          asChild
        >
          <a href={`/leads?source=ai_agent&phone=${encodeURIComponent(detail.caller_phone ?? "")}`}>
            <UserPlus className="h-3.5 w-3.5" />
            View Lead
          </a>
        </Button>
        <Button
          variant={handled ? "secondary" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5 cursor-pointer",
            handled && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          )}
          onClick={() => setHandled(!handled)}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {handled ? "Handled" : "Mark as Handled"}
        </Button>
      </div>

      <Separator />

      {/* Extracted data */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Extracted Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ExtractedDataGrid data={detail.extracted_data} />
        </CardContent>
      </Card>

      {/* AI Summary */}
      {detail.ai_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {detail.ai_summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transcript */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <TranscriptViewer
            transcriptData={detail.transcript_data}
            transcriptText={detail.transcript_text}
          />
        </CardContent>
      </Card>
    </div>
  )
}
