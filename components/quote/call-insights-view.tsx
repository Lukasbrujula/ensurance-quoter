"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  ChevronRight,
  ChevronDown,
  Copy,
  MessageSquare,
  Mic,
  Sparkles,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useCallStore } from "@/lib/store/call-store"
import { useCoachingInterval } from "@/hooks/use-coaching-interval"
import { InsightCard, type LiveInsight } from "./insight-card"
import { TranscriptEntryBubble } from "@/components/calling/transcript-entry"
import { CoachingHintCard } from "@/components/calling/coaching-hint-card"
import { detectMedications } from "@/lib/data/medication-keywords"
import { toast } from "sonner"
import type { CoachingHint } from "@/lib/types/call"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CallInsightsViewProps {
  isPostCall: boolean
  onReturnToChat: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CallInsightsView({
  isPostCall,
  onReturnToChat,
}: CallInsightsViewProps) {
  useCoachingInterval()

  const transcript = useCallStore((s) => s.transcript)
  const coachingHints = useCallStore((s) => s.coachingHints)
  const callState = useCallStore((s) => s.callState)

  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const detectedRef = useRef(new Set<string>())
  const [medicationInsights, setMedicationInsights] = useState<LiveInsight[]>([])

  const isCallActive =
    callState === "active" ||
    callState === "held" ||
    callState === "ringing" ||
    callState === "connecting"

  // Reset detected keywords when call starts
  const prevCallState = useRef(callState)
  useEffect(() => {
    if (isCallActive && prevCallState.current === "idle") {
      detectedRef.current = new Set()
      setMedicationInsights([])
    }
    prevCallState.current = callState
  }, [callState, isCallActive])

  // Client-side medication/condition detection on new transcript entries
  useEffect(() => {
    if (transcript.length === 0) return

    // Only check final entries from client
    const clientText = transcript
      .filter((e) => e.isFinal && e.speaker === "client")
      .map((e) => e.text)
      .join(" ")

    const matches = detectMedications(clientText)
    const newInsights: LiveInsight[] = []

    for (const match of matches) {
      if (detectedRef.current.has(match.condition)) continue
      detectedRef.current.add(match.condition)

      newInsights.push({
        id: `med-${match.keyword}-${Date.now()}`,
        type: match.keyword === match.condition.toLowerCase() ? "condition" : "medication",
        severity: match.severity,
        title: `${match.condition} detected`,
        details: Object.entries(match.carriers).map(
          ([carrier, status]) => `${carrier}: ${status}`,
        ),
        timestamp: Date.now(),
      })
    }

    if (newInsights.length > 0) {
      setMedicationInsights((prev) => [...newInsights, ...prev])
    }
  }, [transcript])

  // Convert coaching hints to insight cards
  const coachingInsights = useMemo<LiveInsight[]>(
    () =>
      coachingHints.map((hint: CoachingHint) => ({
        id: `coach-${hint.id}`,
        type: "coaching" as const,
        severity: hint.type === "warning" ? "warning" as const : hint.type === "tip" ? "tip" as const : "info" as const,
        title: hint.text,
        details: hint.relatedCarriers.length > 0
          ? [`Related: ${hint.relatedCarriers.join(", ")}`]
          : [],
        timestamp: hint.timestamp * 1000,
      })),
    [coachingHints],
  )

  // Merge all insights, newest first
  const allInsights = useMemo(() => {
    const merged = [...medicationInsights, ...coachingInsights]
    return merged.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
  }, [medicationInsights, coachingInsights])

  // Final transcript entries count
  const finalEntryCount = transcript.filter((e) => e.isFinal).length

  const handleCopyTranscript = useCallback(() => {
    const text = transcript
      .filter((e) => e.isFinal)
      .map((e) => `[${e.speaker === "agent" ? "Agent" : "Client"}] ${e.text}`)
      .join("\n")
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Transcript copied"))
      .catch(() => toast.error("Failed to copy transcript"))
  }, [transcript])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-3 py-3">
          {/* Insights Section */}
          {allInsights.length === 0 && !isCallActive && !isPostCall && (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9]">
                <Sparkles className="h-5 w-5 text-[#94a3b8]" />
              </div>
              <p className="mt-4 text-[13px] font-medium text-[#475569]">
                No insights yet
              </p>
            </div>
          )}

          {allInsights.length === 0 && isCallActive && (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9]">
                <Mic className="h-5 w-5 text-[#94a3b8]" />
              </div>
              <p className="mt-4 text-[13px] font-medium text-[#475569]">
                Listening for insights...
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#94a3b8]">
                Medication mentions, conditions, and coaching tips will appear
                here automatically.
              </p>
            </div>
          )}

          {allInsights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 pb-1">
                <Sparkles className="h-3 w-3 text-[#1773cf]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1773cf]">
                  Live Insights
                </span>
              </div>
              {allInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}

          {/* Collapsible Raw Transcript */}
          {(transcript.length > 0 || isPostCall) && (
            <div className="mt-4 border-t border-[#e2e8f0] pt-3">
              <button
                type="button"
                onClick={() => setTranscriptOpen((p) => !p)}
                className="flex w-full items-center gap-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-[#0f172a]"
              >
                {transcriptOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                View Raw Transcript
                {finalEntryCount > 0 && (
                  <span className="ml-1 text-[10px] text-[#94a3b8]">
                    ({finalEntryCount} lines)
                  </span>
                )}
              </button>

              {transcriptOpen && (
                <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-md bg-[#f9fafb] p-2">
                  {transcript.length === 0 ? (
                    <p className="py-4 text-center text-[11px] text-muted-foreground">
                      No transcript available
                    </p>
                  ) : (
                    <>
                      {transcript.map((entry) =>
                        entry.isFinal ? (
                          <TranscriptEntryBubble key={entry.id} entry={entry} />
                        ) : null,
                      )}
                      {coachingHints.map((hint) => (
                        <CoachingHintCard key={hint.id} hint={hint} />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Post-call footer */}
      {isPostCall && (
        <div className="flex items-center gap-2 border-t border-[#e2e8f0] px-4 py-3">
          <button
            type="button"
            onClick={onReturnToChat}
            className="flex items-center gap-1.5 rounded-sm bg-[#f1f5f9] px-3 py-1.5 text-[11px] font-medium text-[#475569] transition-colors hover:bg-[#e2e8f0]"
          >
            <MessageSquare className="h-3 w-3" />
            Return to Chat
          </button>
          {transcript.length > 0 && (
            <button
              type="button"
              onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 rounded-sm bg-[#f1f5f9] px-3 py-1.5 text-[11px] font-medium text-[#475569] transition-colors hover:bg-[#e2e8f0]"
            >
              <Copy className="h-3 w-3" />
              Copy Transcript
            </button>
          )}
        </div>
      )}
    </div>
  )
}
