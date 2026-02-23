"use client"

import { useCallback, useState } from "react"
import {
  Phone,
  PhoneOff,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useCallStore } from "@/lib/store/call-store"
import { useLeadStore } from "@/lib/store/lead-store"
import { connectAndReady } from "@/lib/telnyx/connect"
import { hangupCall, holdCall, unholdCall, toggleCallMute } from "@/lib/telnyx/active-call"
import { acceptInboundCall, declineInboundCall } from "@/lib/telnyx/inbound-handler"
import { toast } from "sonner"

/**
 * Always-visible two-row dialer strip at the top of the AI assistant panel.
 *
 * Row 1: Contact carousel — name + left/right navigation arrows
 * Row 2: Call action bar — adapts to call state
 */
export function PanelDialer() {
  const activeLead = useLeadStore((s) => s.activeLead)
  const leads = useLeadStore((s) => s.leads)
  const navigateToNextLead = useLeadStore((s) => s.navigateToNextLead)
  const navigateToPrevLead = useLeadStore((s) => s.navigateToPrevLead)
  const getActiveLeadIndex = useLeadStore((s) => s.getActiveLeadIndex)

  const callState = useCallStore((s) => s.callState)
  const callDirection = useCallStore((s) => s.callDirection)
  const canDial = useCallStore((s) => s.canDial)
  const setCallConnecting = useCallStore((s) => s.setCallConnecting)
  const setError = useCallStore((s) => s.setError)
  const resetCall = useCallStore((s) => s.resetCall)
  const isMuted = useCallStore((s) => s.isMuted)
  const isOnHold = useCallStore((s) => s.isOnHold)
  const toggleMute = useCallStore((s) => s.toggleMute)
  const inboundCallerNumber = useCallStore((s) => s.inboundCallerNumber)

  const [isInitializing, setIsInitializing] = useState(false)

  const phoneNumber = activeLead?.phone ?? null

  const isInboundRinging = callDirection === "inbound" && callState === "ringing"
  const isActive = callState === "active" || callState === "held"
  const isConnecting = callState === "connecting" || (callState === "ringing" && callDirection === "outbound")
  const isEnding = callState === "ending"
  const isIdle = callState === "idle" || callState === "error"

  // Arrows disabled during any non-idle state
  const arrowsDisabled = !isIdle

  const activeIndex = getActiveLeadIndex()
  const hasLeads = leads.length > 0

  const contactName = activeLead
    ? [activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ") || "Unknown Contact"
    : null

  const handleCall = useCallback(async () => {
    if (!activeLead || !phoneNumber) return

    setIsInitializing(true)
    setCallConnecting(activeLead.id, phoneNumber)

    try {
      const res = await fetch("/api/telnyx/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: activeLead.id }),
      })

      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null

      if (!res.ok) {
        throw new Error((body?.error as string) ?? "Failed to get call token")
      }

      const token = body?.token as string
      const callerNumber = body?.callerNumber as string

      if (!token) {
        throw new Error("No token received from server")
      }

      const client = await connectAndReady(token)
      client.newCall({
        destinationNumber: phoneNumber,
        callerNumber,
      })

      toast.info(`Calling ${phoneNumber}...`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start call"
      setError(msg)
      toast.error(msg)
      resetCall()
    } finally {
      setIsInitializing(false)
    }
  }, [activeLead, phoneNumber, setCallConnecting, setError, resetCall])

  const handleMute = useCallback(() => {
    toggleCallMute()
    toggleMute()
  }, [toggleMute])

  const handleHold = useCallback(() => {
    if (isOnHold) {
      unholdCall()
    } else {
      holdCall()
    }
  }, [isOnHold])

  return (
    <div className="border-b border-[#e2e8f0] bg-[#f9fafb]">
      {/* ── Row 1: Contact Carousel ──────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5">
        {isInboundRinging ? (
          /* Inbound ringing override */
          <div className="flex flex-1 items-center justify-center gap-1.5">
            <Phone className="h-3 w-3 animate-pulse text-emerald-500" />
            <span className="text-[12px] font-semibold text-[#0f172a]">
              Incoming: {inboundCallerNumber ?? "Unknown"}
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={navigateToPrevLead}
              disabled={arrowsDisabled || !hasLeads}
              className="flex h-6 w-6 items-center justify-center rounded text-[#64748b] transition-colors hover:bg-[#e2e8f0] hover:text-[#0f172a] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous contact"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex min-w-0 flex-1 flex-col items-center">
              {contactName ? (
                <>
                  <span className="max-w-full truncate text-[12px] font-semibold text-[#0f172a]">
                    {contactName}
                  </span>
                  {leads.length > 1 && (
                    <span className="text-[10px] text-[#94a3b8]">
                      {activeIndex + 1} of {leads.length}
                    </span>
                  )}
                </>
              ) : hasLeads ? (
                <span className="text-[11px] text-[#94a3b8]">Select a contact</span>
              ) : (
                <span className="text-[11px] text-[#94a3b8]">No contact selected</span>
              )}
            </div>

            <button
              type="button"
              onClick={navigateToNextLead}
              disabled={arrowsDisabled || !hasLeads}
              className="flex h-6 w-6 items-center justify-center rounded text-[#64748b] transition-colors hover:bg-[#e2e8f0] hover:text-[#0f172a] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next contact"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Row 2: Call Action ────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 px-3 pb-2.5">
        {/* Idle */}
        {isIdle && (
          <button
            type="button"
            onClick={handleCall}
            disabled={!canDial() || !phoneNumber || isInitializing}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500 text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title={phoneNumber ? `Call ${phoneNumber}` : "No phone number on lead"}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold">CALL</span>
            {phoneNumber && (
              <span className="ml-0.5 text-[10px] font-medium opacity-80">{phoneNumber}</span>
            )}
          </button>
        )}

        {/* Connecting / Outbound ringing */}
        {isConnecting && (
          <>
            <div className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-amber-50 text-amber-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-[11px] font-bold">CONNECTING...</span>
            </div>
            <button
              type="button"
              onClick={hangupCall}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-red-500 text-white transition-colors hover:bg-red-600"
              title="Cancel call"
            >
              <PhoneOff className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        {/* Inbound ringing: Accept / Decline */}
        {isInboundRinging && (
          <>
            <button
              type="button"
              onClick={acceptInboundCall}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500 text-white shadow-sm transition-colors hover:bg-emerald-600 animate-pulse"
              title="Accept incoming call"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold">ACCEPT</span>
            </button>
            <button
              type="button"
              onClick={declineInboundCall}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500 text-white transition-colors hover:bg-red-600"
              title="Decline incoming call"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold">DECLINE</span>
            </button>
          </>
        )}

        {/* Active / Held: Mute + Hold + End */}
        {isActive && (
          <>
            <button
              type="button"
              onClick={handleMute}
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                isMuted
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-white text-[#64748b] shadow-sm hover:bg-[#f1f5f9]"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleHold}
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                isOnHold
                  ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                  : "bg-white text-[#64748b] shadow-sm hover:bg-[#f1f5f9]"
              }`}
              title={isOnHold ? "Resume" : "Hold"}
            >
              {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={hangupCall}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-red-500 text-white transition-colors hover:bg-red-600"
              title="End call"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold">END</span>
            </button>
          </>
        )}

        {/* Ending */}
        {isEnding && (
          <div className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#f1f5f9] text-[#94a3b8]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-[11px] font-bold">ENDING...</span>
          </div>
        )}
      </div>
    </div>
  )
}
