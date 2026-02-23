/* ------------------------------------------------------------------ */
/*  Post-Call Persistence                                              */
/*  Formats transcript, generates AI summary, saves call log to DB.   */
/*  Called from notification-handler on hangup.                        */
/* ------------------------------------------------------------------ */

import { useCallStore } from "@/lib/store/call-store"
import { useLeadStore } from "@/lib/store/lead-store"
import type { TranscriptEntry, CoachingHint } from "@/lib/types/call"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Transcript formatting                                              */
/* ------------------------------------------------------------------ */

function formatTranscript(entries: TranscriptEntry[]): string {
  return entries
    .filter((e) => e.isFinal)
    .map((e) => {
      const speaker = e.speaker === "agent" ? "Agent" : "Client"
      const time = formatTimestamp(e.timestamp)
      return `[${time}] ${speaker}: ${e.text}`
    })
    .join("\n")
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/* ------------------------------------------------------------------ */
/*  Coaching hints → JSON                                              */
/* ------------------------------------------------------------------ */

function hintsToJson(
  hints: CoachingHint[],
): Array<{ type: string; text: string; timestamp: number; relatedCarriers: string[] }> {
  return hints.map((h) => ({
    type: h.type,
    text: h.text,
    timestamp: h.timestamp,
    relatedCarriers: h.relatedCarriers,
  }))
}

/* ------------------------------------------------------------------ */
/*  AI Summary                                                         */
/* ------------------------------------------------------------------ */

async function fetchAiSummary(transcript: string): Promise<string | null> {
  try {
    const res = await fetch("/api/call-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data as { summary?: string }).summary ?? null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Save call log with retry                                           */
/* ------------------------------------------------------------------ */

async function saveWithRetry(
  payload: Record<string, unknown>,
  attempts: number = 3,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch("/api/call-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) return true

      // Non-retryable client errors
      if (res.status >= 400 && res.status < 500) return false
    } catch {
      // Network error — retry
    }

    // Exponential backoff: 1s, 2s, 4s
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
  return false
}

/* ------------------------------------------------------------------ */
/*  Main: persist call data                                            */
/* ------------------------------------------------------------------ */

export async function persistCallData(): Promise<void> {
  const state = useCallStore.getState()

  const {
    activeLeadId,
    activeCallId,
    callDirection,
    callDuration,
    callStartedAt,
    transcript,
    coachingHints,
  } = state

  // Skip if no lead or no transcript content
  if (!activeLeadId) return
  const finalEntries = transcript.filter((e) => e.isFinal)
  if (finalEntries.length === 0) return

  const transcriptText = formatTranscript(transcript)
  const startedAt = callStartedAt ? new Date(callStartedAt).toISOString() : null
  const endedAt = startedAt ? new Date(Date.now()).toISOString() : null

  // Generate AI summary (non-blocking — save still happens if this fails)
  const aiSummary = await fetchAiSummary(transcriptText)

  const payload = {
    leadId: activeLeadId,
    direction: callDirection ?? "outbound",
    provider: "telnyx",
    providerCallId: activeCallId,
    durationSeconds: callDuration,
    transcriptText,
    aiSummary,
    coachingHints: coachingHints.length > 0 ? hintsToJson(coachingHints) : null,
    startedAt,
    endedAt,
  }

  const saved = await saveWithRetry(payload)

  if (saved) {
    const summaryPreview = aiSummary
      ? aiSummary.length > 80
        ? `${aiSummary.slice(0, 80)}...`
        : aiSummary
      : "No summary"
    toast.success(`Call saved — ${formatDuration(callDuration)} — ${summaryPreview}`)

    // Offer to schedule a follow-up (pre-fill tomorrow at call start time)
    const leadState = useLeadStore.getState()
    const lead = leadState.activeLead
    if (lead && !lead.followUpDate) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (startedAt) {
        const callTime = new Date(startedAt)
        tomorrow.setHours(callTime.getHours(), callTime.getMinutes(), 0, 0)
      } else {
        tomorrow.setHours(10, 0, 0, 0)
      }

      toast("Schedule a follow-up?", {
        duration: 10000,
        action: {
          label: "Tomorrow " + tomorrow.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          onClick: () => {
            const followUpDate = tomorrow.toISOString()
            useLeadStore.setState((s) => {
              if (!s.activeLead || s.activeLead.id !== lead.id) return s
              return {
                activeLead: { ...s.activeLead, followUpDate, followUpNote: null },
                leads: s.leads.map((l) =>
                  l.id === lead.id ? { ...l, followUpDate, followUpNote: null } : l,
                ),
                dirtyFields: new Set([...s.dirtyFields, "followUpDate", "followUpNote"]),
              }
            })
          },
        },
      })
    }
  } else {
    toast.error("Failed to save call log — please check your connection")
  }
}
