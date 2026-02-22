"use client"

import { useCallback, useEffect, useRef } from "react"
import { disconnect } from "@/lib/telnyx/client"
import { connectAndReady } from "@/lib/telnyx/connect"
import { useCallStore } from "@/lib/store/call-store"
import { RemoteAudio } from "./remote-audio"

/**
 * Global call handler mounted in root layout.
 * Auto-connects the TelnyxRTC client on mount using SIP credentials
 * so the client registers with Telnyx and can receive inbound calls.
 * Drives the call duration timer globally (ActiveCallBar only renders
 * on lead-detail pages, so this ensures the timer ticks everywhere).
 * Ensures audio playback persists across route navigation and
 * cleans up on page unload.
 *
 * Notification processing is handled by lib/telnyx/notification-handler.ts
 * (wired as a callback during client initialization in connect.ts).
 */
export function CallNotificationHandler() {
  const didConnect = useRef(false)
  const callState = useCallStore((s) => s.callState)
  const tickDuration = useCallStore((s) => s.tickDuration)

  // Stable ref so the interval callback always calls the latest function
  // without including it in the dependency array (Zustand returns a new
  // function reference on every store update, which would constantly
  // recreate the interval and prevent it from ever ticking).
  const tickRef = useRef(tickDuration)
  tickRef.current = tickDuration
  const tick = useCallback(() => tickRef.current(), [])

  // Global timer — ticks every second while call is active or held,
  // regardless of which page the user is on.
  useEffect(() => {
    if (callState === "active" || callState === "held") {
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }
  }, [callState, tick])

  useEffect(() => {
    // Auto-connect once on mount for inbound call readiness
    if (!didConnect.current) {
      didConnect.current = true
      void (async () => {
        try {
          // Fetch SIP credentials for persistent registration
          const res = await fetch("/api/telnyx/credentials")
          if (!res.ok) {
            console.error("[CallNotificationHandler] Failed to fetch credentials:", res.status)
            return
          }
          const data = (await res.json()) as {
            login?: string
            password?: string
            callerNumber?: string
          }
          if (!data.login || !data.password) {
            console.error("[CallNotificationHandler] No SIP credentials in response")
            return
          }
          await connectAndReady({ login: data.login, password: data.password })

          // Pre-warm microphone permission so call.answer() doesn't fail
          // in Safari (strict getUserMedia policy). The stream is stopped
          // immediately — we just need the browser to remember the grant.
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach((t) => t.stop())
          } catch {
            console.warn("[CallNotificationHandler] Mic permission not granted — inbound calls may fail")
          }
        } catch (err) {
          console.error("[CallNotificationHandler] Auto-connect failed:", err)
        }
      })()
    }

    const handleUnload = () => {
      disconnect()
    }
    window.addEventListener("beforeunload", handleUnload)
    return () => {
      window.removeEventListener("beforeunload", handleUnload)
      disconnect()
    }
  }, [])

  return <RemoteAudio />
}
