"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Phone,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { TranscriptModal } from "./transcript-modal"
import type { CallLogEntry } from "@/lib/types/call"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CallLogViewerProps {
  leadId: string
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

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/* ------------------------------------------------------------------ */
/*  Call Log Entry Card                                                */
/* ------------------------------------------------------------------ */

function CallLogCard({
  log,
  onViewTranscript,
}: {
  log: CallLogEntry
  onViewTranscript: (log: CallLogEntry) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-md border bg-white">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f8fafc] transition-colors"
          >
            <Phone className="h-4 w-4 shrink-0 text-[#64748b]" />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-[#0f172a]">
                  {formatDate(log.startedAt)}
                </span>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(log.durationSeconds)}
                </Badge>
                {log.aiSummary?.startsWith("AI agent collected") && (
                  <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                    AI Agent
                  </Badge>
                )}
              </div>

              {log.aiSummary && (
                <p className="mt-1 text-[12px] leading-snug text-[#64748b] line-clamp-2">
                  {log.aiSummary}
                </p>
              )}
            </div>

            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-[#94a3b8]" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8]" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-3">
            {log.aiSummary && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                  Summary
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#334155]">
                  {log.aiSummary}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-[12px] text-[#64748b]">
              <span>
                Direction: <strong className="text-[#334155]">{log.direction}</strong>
              </span>
              <span className="text-[#e2e8f0]">|</span>
              <span>
                Provider: <strong className="text-[#334155]">{log.provider}</strong>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewTranscript(log)}
              className="gap-2"
            >
              <FileText className="h-3.5 w-3.5" />
              View Full Transcript
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CallLogViewer({ leadId }: CallLogViewerProps) {
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transcriptLog, setTranscriptLog] = useState<CallLogEntry | null>(null)
  const [sectionOpen, setSectionOpen] = useState(true)

  const fetchCallLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/call-log/${leadId}`)
      if (!res.ok) throw new Error("Failed to load call logs")
      const data = (await res.json()) as { callLogs: CallLogEntry[] }
      setCallLogs(data.callLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load call logs")
    } finally {
      setIsLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    void fetchCallLogs()
  }, [fetchCallLogs])

  // Don't render section if no calls and not loading
  if (!isLoading && callLogs.length === 0 && !error) return null

  return (
    <>
      <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
        <div className="border-t border-[#e2e8f0] bg-white">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#f8fafc] transition-colors lg:px-6"
            >
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#64748b]" />
                <span className="text-[13px] font-semibold text-[#0f172a]">
                  Call History
                </span>
                {callLogs.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {callLogs.length}
                  </Badge>
                )}
              </div>
              {sectionOpen ? (
                <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2 lg:px-6">
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[#94a3b8]" />
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <p className="text-[12px] text-red-500">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchCallLogs}>
                    Retry
                  </Button>
                </div>
              )}

              {!isLoading &&
                !error &&
                callLogs.map((log) => (
                  <CallLogCard
                    key={log.id}
                    log={log}
                    onViewTranscript={setTranscriptLog}
                  />
                ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <TranscriptModal
        callLog={transcriptLog}
        open={transcriptLog !== null}
        onOpenChange={(open) => {
          if (!open) setTranscriptLog(null)
        }}
      />
    </>
  )
}
