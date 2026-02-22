/* ------------------------------------------------------------------ */
/*  Telnyx Notification Handler                                        */
/*  Maps TelnyxRTC call state events to our Zustand call-store.        */
/*  Pure module — no React dependencies, safe to call from anywhere.   */
/* ------------------------------------------------------------------ */

import { useCallStore } from "@/lib/store/call-store"
import { setActiveCall, getLocalStream, getRemoteStream } from "./active-call"
import type { TelnyxNotification } from "./client"
import { startTranscription, stopTranscription } from "@/lib/deepgram/stream"
import { persistCallData } from "./post-call-save"
import { handleInboundCall } from "./inbound-handler"
import { toast } from "sonner"

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Tracked timeout for post-hangup reset, so it can be cancelled on redial. */
let hangupTimeoutId: ReturnType<typeof setTimeout> | null = null

function clearHangupTimeout(): void {
  if (hangupTimeoutId) {
    clearTimeout(hangupTimeoutId)
    hangupTimeoutId = null
  }
}

/**
 * Process a TelnyxRTC notification event.
 *
 * Telnyx call states → our CallState mapping:
 *   new, requesting, trying → (connecting — already set by CallButton)
 *   ringing                 → ringing
 *   early, answering        → (transitional — keep current state)
 *   active                  → active
 *   held                    → held
 *   hangup                  → ending → idle (after 2s)
 *   destroy, purge          → idle (immediate reset)
 */
export function handleTelnyxNotification(
  notification: TelnyxNotification,
): void {
  // Handle microphone permission errors
  if (notification.type === "userMediaError") {
    stopTranscription()
    clearHangupTimeout()
    useCallStore
      .getState()
      .setError("Microphone access denied")
    toast.error(
      "Microphone access denied — please allow microphone access and try again",
    )
    useCallStore.getState().resetCall()
    setActiveCall(null)
    return
  }

  // Handle WebRTC peer connection failures (ICE/DTLS negotiation).
  // The SDK does NOT hang up the call on this error — the SIP layer
  // may still work. Log and warn, but don't reset the call.
  if (notification.type === "peerConnectionFailureError") {
    console.warn("[NotificationHandler] Peer connection issue — audio may be affected")
    return
  }

  if (notification.type !== "callUpdate" || !notification.call) return

  const call = notification.call as any
  const telnyxState = call.state as string
  const callId: string = (call.id ?? call.sipCallId ?? "") as string

  // Try SDK properties for direction
  const sdkDirection = (call.direction ?? call.options?.direction) as
    | string
    | undefined

  const store = useCallStore.getState()

  // Heuristic: outbound calls always call setCallConnecting() BEFORE
  // any SDK notification fires, setting callDirection to "outbound".
  // So if the store is still idle with no direction, the call must be
  // inbound. This catches cases where the SDK doesn't set `direction`.
  const isInbound =
    sdkDirection === "inbound" ||
    (store.callState === "idle" && store.callDirection !== "outbound")

  console.debug("[NotificationHandler] Call update:", {
    state: telnyxState,
    sdkDirection,
    isInbound,
    callId,
  })

  // Cancel pending hangup reset if a new call event arrives
  if (telnyxState !== "hangup") {
    clearHangupTimeout()
  }

  setActiveCall(call)

  switch (telnyxState) {
    case "new":
    case "requesting":
    case "trying": {
      // For outbound: callConnecting was already set by CallButton — no-op.
      // For inbound: these can precede "ringing", so detect and route early.
      if (isInbound && store.callState === "idle") {
        handleInboundCall(call, callId)
      }
      break
    }

    case "ringing": {
      if (isInbound && store.callState === "idle") {
        handleInboundCall(call, callId)
      } else if (store.callDirection !== "inbound") {
        // Outbound ringing — don't overwrite inbound state if already set
        store.setCallRinging(callId)
      }
      break
    }

    case "early":
    case "answering":
      // Transitional SIP states — stay in current state
      break

    case "active":
      if (store.callState === "held") {
        // Resuming from hold
        store.setCallUnheld()
      } else {
        if (store.callState !== "active") {
          // If this is an inbound call that skipped our ringing detection
          // (e.g. SDK auto-answer or states fired too fast), mark it as
          // inbound so post-call persistence captures the direction.
          if (isInbound && store.callDirection !== "inbound") {
            const callerNumber: string =
              call?.options?.remoteCallerNumber ??
              call?.options?.callerNumber ??
              "Unknown"
            useCallStore.setState({
              callDirection: "inbound",
              inboundCallerNumber: callerNumber,
            })
          }

          store.setCallActive(callId)
          toast.success("Call connected")
        }

        // Start transcription when SDK reports "active" — streams should
        // have audio tracks at this point. For inbound calls where
        // acceptInboundCall already set callState to "active", this
        // serves as a backup trigger once ICE completes.
        // startTranscription cleans up any prior session first.
        // TODO(P3): Gate on recording consent (see compliance.md).
        const local = getLocalStream()
        const remote = getRemoteStream()
        if (local?.getAudioTracks().length && remote?.getAudioTracks().length) {
          startTranscription(local, remote)
        }
      }
      break

    case "held":
      store.setCallHeld()
      break

    case "hangup":
      stopTranscription()
      store.setCallEnding()
      toast.info("Call ended")
      clearHangupTimeout()
      // Persist call data before resetting store
      void persistCallData().finally(() => {
        hangupTimeoutId = setTimeout(() => {
          hangupTimeoutId = null
          useCallStore.getState().resetCall()
          setActiveCall(null)
        }, 500)
      })
      break

    case "destroy":
    case "purge":
      stopTranscription()
      clearHangupTimeout()
      store.resetCall()
      setActiveCall(null)
      break
  }
}
