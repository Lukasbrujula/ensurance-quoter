"use client"

import { useCallStore } from "@/lib/store/call-store"
import {
  hangupCall,
  holdCall,
  unholdCall,
  toggleCallMute,
} from "@/lib/telnyx/active-call"
import { PhoneOff, Mic, MicOff, Pause, Play } from "lucide-react"

/**
 * Compact call control bar for the AI panel's call mode.
 * Shows mute, hold, and hangup buttons during active/held calls.
 */
export function InlineCallControls() {
  const callState = useCallStore((s) => s.callState)
  const isMuted = useCallStore((s) => s.isMuted)
  const isOnHold = useCallStore((s) => s.isOnHold)
  const toggleMute = useCallStore((s) => s.toggleMute)

  const canControl = callState === "active" || callState === "held"
  if (!canControl) return null

  const handleMute = () => {
    toggleCallMute()
    toggleMute()
  }

  const handleHold = () => {
    if (isOnHold) {
      unholdCall()
    } else {
      holdCall()
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-[#e2e8f0] px-4 py-2">
      {/* Mute */}
      <button
        type="button"
        onClick={handleMute}
        aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          isMuted
            ? "bg-red-100 text-red-600 hover:bg-red-200"
            : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
        }`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>

      {/* Hold */}
      <button
        type="button"
        onClick={handleHold}
        aria-label={isOnHold ? "Resume call" : "Put call on hold"}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          isOnHold
            ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
            : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]"
        }`}
        title={isOnHold ? "Resume" : "Hold"}
      >
        {isOnHold ? (
          <Play className="h-4 w-4" />
        ) : (
          <Pause className="h-4 w-4" />
        )}
      </button>

      {/* Hangup */}
      <button
        type="button"
        onClick={hangupCall}
        aria-label="End call"
        className="flex h-8 items-center gap-1.5 rounded-full bg-red-500 px-4 text-white transition-colors hover:bg-red-600"
        title="End call"
      >
        <PhoneOff className="h-3.5 w-3.5" />
        <span className="text-[11px] font-bold">END</span>
      </button>
    </div>
  )
}
