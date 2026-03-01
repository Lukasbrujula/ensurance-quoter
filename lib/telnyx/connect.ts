/* ------------------------------------------------------------------ */
/*  Telnyx Connection Orchestration                                    */
/*  Initializes the TelnyxRTC client and waits for ready state.        */
/* ------------------------------------------------------------------ */

import type { TelnyxRTC } from "@telnyx/webrtc"
import type { TelnyxClientCredentials } from "./client"
import { initClient, getClient } from "./client"
import { handleTelnyxNotification } from "./notification-handler"
import { useCallStore } from "@/lib/store/call-store"
import { toast } from "sonner"

const CONNECTION_TIMEOUT_MS = 15_000

/**
 * Initialize the TelnyxRTC client and wait for it to reach "ready" state.
 * Accepts either a token string (outbound) or credentials object (persistent).
 * If a client already exists and is ready, returns immediately.
 * Throws on timeout (15s) or connection error.
 */
export async function connectAndReady(
  credentials: string | TelnyxClientCredentials,
): Promise<TelnyxRTC> {
  // If already connected and ready, reuse
  const existing = getClient()
  if (existing && useCallStore.getState().isClientReady) {
    return existing
  }

  // Normalize to credentials object
  const creds: TelnyxClientCredentials =
    typeof credentials === "string" ? { token: credentials } : credentials

  return new Promise<TelnyxRTC>((resolve, reject) => {
    let settled = false

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error("Telnyx connection timeout (15s)"))
      }
    }, CONNECTION_TIMEOUT_MS)

    initClient({
      ...creds,
      onReady: () => {
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        useCallStore.getState().setClientReady(true)
        const client = getClient()
        if (client) {
          resolve(client)
        } else {
          reject(new Error("Client unavailable after ready"))
        }
      },
      onError: (error) => {
        console.error("[Telnyx] Connection error:", error instanceof Error ? error.message : String(error))
        if (settled) return
        settled = true
        clearTimeout(timeoutId)
        const msg =
          error instanceof Error ? error.message : "Connection failed"
        useCallStore.getState().setError(msg)
        reject(new Error(msg))
      },
      onNotification: handleTelnyxNotification,
      onSocketClose: () => {
        useCallStore.getState().setClientReady(false)
        toast.error("Call connection lost")
      },
    }).catch((err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeoutId)
        reject(err)
      }
    })
  })
}
