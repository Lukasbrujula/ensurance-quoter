import { create } from "zustand"
import type {
  CallState,
  TranscriptEntry,
  CoachingHint,
} from "@/lib/types/call"
import type { CoachingCard } from "@/lib/types/coaching"

/* ------------------------------------------------------------------ */
/*  CallStore — telephony state for Telnyx WebRTC calls                */
/* ------------------------------------------------------------------ */

interface CallStoreState {
  // Connection
  isClientReady: boolean
  callerNumber: string | null

  // Active call
  activeCallId: string | null
  activeLeadId: string | null
  callState: CallState
  callDirection: "inbound" | "outbound" | null
  destinationNumber: string | null
  inboundCallerNumber: string | null
  callStartedAt: number | null
  callDuration: number

  // Controls
  isMuted: boolean
  isOnHold: boolean

  // Transcript + Coaching (populated by P2-03 and P2-05)
  transcript: TranscriptEntry[]
  coachingHints: CoachingHint[]

  // Coaching Cards (T11.1b — structured card stack)
  coachingCards: CoachingCard[]

  // Error
  error: string | null
}

interface CallStoreActions {
  // Connection lifecycle
  setClientReady: (ready: boolean) => void
  setCallerNumber: (number: string) => void

  // Call lifecycle
  setCallConnecting: (leadId: string | null, destination: string) => void
  setCallRinging: (callId: string) => void
  setInboundRinging: (callId: string, callerNumber: string) => void
  setCallActive: (callId: string) => void
  setCallHeld: () => void
  setCallUnheld: () => void
  setCallEnding: () => void
  resetCall: () => void

  // Controls
  setMuted: (muted: boolean) => void
  setOnHold: (held: boolean) => void
  toggleMute: () => void
  toggleHold: () => void

  // Timer
  tickDuration: () => void

  // Transcript (P2-03)
  addTranscriptEntry: (entry: TranscriptEntry) => void
  replaceInterimEntry: (finalEntry: TranscriptEntry) => void
  clearTranscript: () => void

  // Coaching (P2-05)
  addCoachingHint: (hint: CoachingHint) => void
  clearCoachingHints: () => void

  // Coaching Cards (T11.1b)
  addCoachingCard: (card: CoachingCard) => void
  dismissCoachingCard: (cardId: string) => void
  clearCoachingCards: () => void

  // Error
  setError: (error: string | null) => void
}

interface CallStoreComputed {
  callDurationFormatted: () => string
  isCallActive: () => boolean
  canDial: () => boolean
}

export type CallStore = CallStoreState & CallStoreActions & CallStoreComputed

const INITIAL_STATE: CallStoreState = {
  isClientReady: false,
  callerNumber: null,
  activeCallId: null,
  activeLeadId: null,
  callState: "idle",
  callDirection: null,
  destinationNumber: null,
  inboundCallerNumber: null,
  callStartedAt: null,
  callDuration: 0,
  isMuted: false,
  isOnHold: false,
  transcript: [],
  coachingHints: [],
  coachingCards: [],
  error: null,
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export const useCallStore = create<CallStore>()((set, get) => ({
  ...INITIAL_STATE,

  // ── Connection lifecycle ──────────────────────────────────────────

  setClientReady: (isClientReady) => set({ isClientReady, error: null }),

  setCallerNumber: (callerNumber) => set({ callerNumber }),

  // ── Call lifecycle ────────────────────────────────────────────────

  setCallConnecting: (leadId, destination) =>
    set({
      callState: "connecting",
      activeLeadId: leadId,
      destinationNumber: destination,
      callDirection: "outbound",
      error: null,
      transcript: [],
      coachingHints: [],
      coachingCards: [],
    }),

  setCallRinging: (callId) =>
    set({
      callState: "ringing",
      activeCallId: callId,
    }),

  setInboundRinging: (callId, callerNumber) =>
    set({
      callState: "ringing",
      activeCallId: callId,
      callDirection: "inbound",
      inboundCallerNumber: callerNumber,
      error: null,
      transcript: [],
      coachingHints: [],
      coachingCards: [],
    }),

  setCallActive: (callId) =>
    set({
      callState: "active",
      activeCallId: callId,
      callStartedAt: Date.now(),
      callDuration: 0,
    }),

  setCallHeld: () => set({ callState: "held", isOnHold: true }),

  setCallUnheld: () => set({ callState: "active", isOnHold: false }),

  setCallEnding: () => set({ callState: "ending" }),

  resetCall: () =>
    set({
      activeCallId: null,
      activeLeadId: null,
      callState: "idle",
      callDirection: null,
      destinationNumber: null,
      inboundCallerNumber: null,
      callStartedAt: null,
      callDuration: 0,
      isMuted: false,
      isOnHold: false,
      transcript: [],
      coachingHints: [],
      coachingCards: [],
      error: null,
    }),

  // ── Controls ──────────────────────────────────────────────────────

  setMuted: (isMuted) => set({ isMuted }),

  setOnHold: (isOnHold) => set({ isOnHold }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleHold: () =>
    set((state) => ({
      isOnHold: !state.isOnHold,
      callState: state.isOnHold ? "active" : "held",
    })),

  // ── Timer ─────────────────────────────────────────────────────────

  tickDuration: () =>
    set((state) => {
      if (!state.callStartedAt) return state
      return { callDuration: Math.floor((Date.now() - state.callStartedAt) / 1000) }
    }),

  // ── Transcript ────────────────────────────────────────────────────

  addTranscriptEntry: (entry) =>
    set((state) => ({ transcript: [...state.transcript, entry] })),

  replaceInterimEntry: (finalEntry) =>
    set((state) => {
      const idx = state.transcript.findIndex(
        (e) => !e.isFinal && Math.abs(e.timestamp - finalEntry.timestamp) < 0.5,
      )
      if (idx === -1) {
        return { transcript: [...state.transcript, finalEntry] }
      }
      return {
        transcript: state.transcript.map((e, i) =>
          i === idx ? finalEntry : e,
        ),
      }
    }),

  clearTranscript: () => set({ transcript: [] }),

  // ── Coaching ──────────────────────────────────────────────────────

  addCoachingHint: (hint) =>
    set((state) => ({ coachingHints: [...state.coachingHints, hint] })),

  clearCoachingHints: () => set({ coachingHints: [] }),

  // ── Coaching Cards (T11.1b) ─────────────────────────────────────

  addCoachingCard: (card) =>
    set((state) => {
      // Style card: replace existing if one already exists
      if (card.type === "style") {
        const withoutStyle = state.coachingCards.filter((c) => c.type !== "style")
        return { coachingCards: [...withoutStyle, card] }
      }
      // Medication: skip duplicate for same medication name
      if (card.type === "medication") {
        const exists = state.coachingCards.some(
          (c) => c.type === "medication" && c.medicationName === card.medicationName,
        )
        if (exists) return state
      }
      return { coachingCards: [...state.coachingCards, card] }
    }),

  dismissCoachingCard: (cardId) =>
    set((state) => ({
      coachingCards: state.coachingCards.filter((c) => c.id !== cardId),
    })),

  clearCoachingCards: () => set({ coachingCards: [] }),

  // ── Error ─────────────────────────────────────────────────────────

  setError: (error) => set({ error, callState: error ? "error" : get().callState }),

  // ── Computed ──────────────────────────────────────────────────────

  callDurationFormatted: () => formatDuration(get().callDuration),

  isCallActive: () => {
    const s = get().callState
    return s === "active" || s === "held" || s === "ringing" || s === "connecting"
  },

  canDial: () => {
    const { callState } = get()
    return callState === "idle"
  },
}))
