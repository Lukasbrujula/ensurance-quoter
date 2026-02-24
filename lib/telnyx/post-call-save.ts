/* ------------------------------------------------------------------ */
/*  Post-Call Persistence                                              */
/*  Formats transcript, generates AI summary, saves call log to DB.   */
/*  Called from notification-handler on hangup.                        */
/* ------------------------------------------------------------------ */

import { useCallStore } from "@/lib/store/call-store"
import { useLeadStore } from "@/lib/store/lead-store"
import type { TranscriptEntry } from "@/lib/types/call"
import type { CoachingCard } from "@/lib/types/coaching"
import { shouldSuggestStatus } from "@/lib/data/pipeline"
import { updateLeadFields } from "@/lib/actions/leads"
import type { Lead } from "@/lib/types/lead"
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
/*  Coaching cards → JSON (structured summary for JSONB column)        */
/* ------------------------------------------------------------------ */

function cardsToJson(cards: CoachingCard[]): Record<string, unknown> {
  const styleCard = cards.find((c) => c.type === "style")
  const medicationCards = cards.filter((c) => c.type === "medication")
  const lifeEventCards = cards.filter((c) => c.type === "life_event")
  const tipCards = cards.filter((c) => c.type === "coaching_tip")

  return {
    style_detected: styleCard?.type === "style" ? styleCard.quadrant : null,
    style_confidence: styleCard?.type === "style" ? styleCard.confidence : null,
    medications_detected: medicationCards.map((c) =>
      c.type === "medication" ? c.medicationName : "",
    ),
    life_events_detected: lifeEventCards.map((c) =>
      c.type === "life_event" ? c.event : "",
    ),
    tips_count: tipCards.length,
    cards,
  }
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
    coachingCards,
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
    coachingHints: coachingCards.length > 0 ? cardsToJson(coachingCards) : null,
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

    // Suggest status advancement to "Contacted"
    const leadStoreForStatus = useLeadStore.getState()
    const leadForStatus = leadStoreForStatus.activeLead
    if (leadForStatus && shouldSuggestStatus(leadForStatus.status, "contacted")) {
      const leadName = [leadForStatus.firstName, leadForStatus.lastName]
        .filter(Boolean)
        .join(" ") || "Lead"
      toast("Move to Contacted?", {
        description: `You just called ${leadName}`,
        duration: 8000,
        action: {
          label: "Yes",
          onClick: async () => {
            const now = new Date().toISOString()
            useLeadStore.setState((s) => {
              if (!s.activeLead || s.activeLead.id !== leadForStatus.id) return s
              const updated = {
                ...s.activeLead,
                status: "contacted" as const,
                statusUpdatedAt: now,
              }
              return {
                activeLead: updated,
                leads: s.leads.map((l) => (l.id === updated.id ? updated : l)),
                dirtyFields: new Set([...s.dirtyFields, "status", "statusUpdatedAt"]),
              }
            })
            const result = await updateLeadFields(leadForStatus.id, {
              status: "contacted",
              statusUpdatedAt: now,
            } as Partial<Lead>)
            if (!result.success) {
              useLeadStore.setState((s) => {
                if (!s.activeLead || s.activeLead.id !== leadForStatus.id) return s
                const reverted = {
                  ...s.activeLead,
                  status: leadForStatus.status,
                  statusUpdatedAt: leadForStatus.statusUpdatedAt,
                }
                return {
                  activeLead: reverted,
                  leads: s.leads.map((l) => (l.id === reverted.id ? reverted : l)),
                }
              })
              toast.error("Failed to update status")
            }
          },
        },
      })
    }

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
