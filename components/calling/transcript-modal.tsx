"use client"

import { useCallback } from "react"
import { Copy, Phone } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  INSIGHT_ICONS,
  INSIGHT_COLORS,
  type InsightType,
} from "@/lib/constants/insight-styles"
import type { CallLogEntry, CoachingHint } from "@/lib/types/call"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TranscriptModalProps {
  callLog: CallLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

interface ParsedLine {
  time: string
  speaker: "Agent" | "Client"
  text: string
}

function parseTranscript(raw: string | null): ParsedLine[] {
  if (!raw) return []
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const match = line.match(/^\[(\d+:\d+)\]\s+(Agent|Client):\s+(.+)$/)
      if (match) {
        return {
          time: match[1],
          speaker: match[2] as "Agent" | "Client",
          text: match[3],
        }
      }
      return { time: "", speaker: "Agent" as const, text: line }
    })
}

/* ------------------------------------------------------------------ */
/*  Coaching hint card (inline)                                        */
/* ------------------------------------------------------------------ */

function InlineHint({ hint }: { hint: CoachingHint }) {
  const type = hint.type as InsightType
  const colors = INSIGHT_COLORS[type] ?? INSIGHT_COLORS.info
  const Icon = INSIGHT_ICONS[type] ?? INSIGHT_ICONS.info

  return (
    <div
      className={`my-2 rounded-md border-l-4 p-3 ${colors.border} ${colors.bg}`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colors.icon}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] leading-relaxed text-[#334155]">
            {hint.text}
          </p>
          {hint.relatedCarriers.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {hint.relatedCarriers.map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="text-[9px] px-1.5 py-0"
                >
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TranscriptModal({
  callLog,
  open,
  onOpenChange,
}: TranscriptModalProps) {
  const lines = parseTranscript(callLog?.transcriptText ?? null)
  const hints = callLog?.coachingHints ?? []

  const handleCopy = useCallback(() => {
    if (!callLog?.transcriptText) return
    void navigator.clipboard.writeText(callLog.transcriptText)
    toast.success("Transcript copied to clipboard")
  }, [callLog?.transcriptText])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-[14px]">
            <Phone className="h-4 w-4" />
            Call Transcript
          </SheetTitle>
          {callLog && (
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
              <span>{formatDateTime(callLog.startedAt)}</span>
              <Badge variant="outline" className="text-[10px]">
                {formatDuration(callLog.durationSeconds)}
              </Badge>
            </div>
          )}
        </SheetHeader>

        {callLog?.aiSummary && (
          <div className="mb-4 rounded-md bg-[#f1f5f9] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              AI Summary
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#334155]">
              {callLog.aiSummary}
            </p>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-1 pr-4">
            {lines.map((line, i) => {
              const isAgent = line.speaker === "Agent"
              return (
                <div key={i}>
                  <div
                    className={`rounded-lg px-3 py-2 ${
                      isAgent
                        ? "bg-[#dbeafe] text-[#1e3a5f]"
                        : "bg-[#f1f5f9] text-[#334155]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                        {line.speaker}
                      </span>
                      {line.time && (
                        <span className="text-[10px] opacity-40">
                          {line.time}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-relaxed">
                      {line.text}
                    </p>
                  </div>

                  {/* Render coaching hints that appeared near this line's timestamp */}
                  {hints
                    .filter((h) => {
                      const lineTime = parseTimeToSeconds(line.time)
                      return (
                        lineTime !== null &&
                        h.timestamp >= lineTime &&
                        h.timestamp < lineTime + 30
                      )
                    })
                    .filter((h, _j, arr) => {
                      // Only render at the first matching line
                      const firstLine = lines.find((l) => {
                        const lt = parseTimeToSeconds(l.time)
                        return lt !== null && h.timestamp >= lt && h.timestamp < lt + 30
                      })
                      return firstLine === line || arr.indexOf(h) === 0
                    })
                    .map((h) => (
                      <InlineHint key={h.id} hint={h} />
                    ))}
                </div>
              )
            })}

            {lines.length === 0 && (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                {callLog?.aiSummary && !callLog?.transcriptText
                  ? "Transcript expired — retained for 90 days per data retention policy."
                  : "No transcript available."}
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy Transcript
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Parse "MM:SS" to seconds                                           */
/* ------------------------------------------------------------------ */

function parseTimeToSeconds(time: string): number | null {
  if (!time) return null
  const parts = time.split(":")
  if (parts.length !== 2) return null
  const m = parseInt(parts[0], 10)
  const s = parseInt(parts[1], 10)
  if (isNaN(m) || isNaN(s)) return null
  return m * 60 + s
}
