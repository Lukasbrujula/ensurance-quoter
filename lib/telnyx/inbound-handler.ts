/* ------------------------------------------------------------------ */
/*  Inbound Call Handler                                               */
/*  Accept / decline inbound calls via the active TelnyxCall object.   */
/* ------------------------------------------------------------------ */

import { useCallStore } from "@/lib/store/call-store"
import { getActiveCall, setActiveCall, getLocalStream, getRemoteStream } from "./active-call"
import { startTranscription } from "@/lib/deepgram/stream"
import { toast } from "sonner"

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Set up call-store state when an inbound call starts ringing.
 * Called from notification-handler when it detects an inbound ringing event.
 */
export function handleInboundCall(call: unknown, callId: string): void {
  const telnyxCall = call as any
  const callerNumber: string =
    telnyxCall?.options?.remoteCallerNumber ??
    telnyxCall?.options?.callerNumber ??
    "Unknown"

  setActiveCall(call)
  useCallStore.getState().setInboundRinging(callId, callerNumber)
}

/**
 * Accept the currently ringing inbound call.
 * Fires answer() without awaiting — the SIP 200 OK is sent immediately
 * but ICE/DTLS negotiation may hang. We transition to active right away
 * so the timer and UI update. Transcription starts after a brief delay
 * to allow media streams to become available.
 */
export function acceptInboundCall(): void {
  const call = getActiveCall() as any
  if (!call) {
    toast.error("No incoming call to accept")
    return
  }

  // Fire and forget — don't await. The promise may hang during ICE
  // negotiation. Errors are handled by the notification handler's
  // peerConnectionFailureError case.
  call.answer().catch((err: unknown) => {
    console.error("[InboundHandler] answer() error:", err)
  })

  // Transition to active immediately so timer and UI update.
  // The notification handler's "active" case will no-op since
  // callState is already "active".
  const store = useCallStore.getState()
  const callId = store.activeCallId ?? ""
  store.setCallActive(callId)
  toast.success("Call connected")

  // Poll for media streams with audio tracks. After answer(), streams
  // exist as MediaStream objects but have zero audio tracks until ICE/DTLS
  // negotiation completes. Both startTranscription and audio-capture bail
  // out when tracks are missing, so we must wait for tracks to appear.
  let streamAttempts = 0
  const tryStartTranscription = () => {
    streamAttempts++
    const local = getLocalStream()
    const remote = getRemoteStream()
    const hasLocalTracks = local && local.getAudioTracks().length > 0
    const hasRemoteTracks = remote && remote.getAudioTracks().length > 0
    if (hasLocalTracks && hasRemoteTracks) {
      startTranscription(local, remote)
    } else if (streamAttempts < 15) {
      setTimeout(tryStartTranscription, 1000)
    }
  }
  setTimeout(tryStartTranscription, 1000)
}

/**
 * Decline the currently ringing inbound call.
 * Hangs up and resets state.
 */
export function declineInboundCall(): void {
  const call = getActiveCall() as any
  if (!call) {
    useCallStore.getState().resetCall()
    return
  }

  try {
    call.hangup()
  } catch {
    // Call may have already ended
  }

  useCallStore.getState().resetCall()
  setActiveCall(null)
}
