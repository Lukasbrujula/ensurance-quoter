import type { TelnyxRTC } from "@telnyx/webrtc"

/* ------------------------------------------------------------------ */
/*  TelnyxRTC Singleton Wrapper                                        */
/*  Manages connection lifecycle, token refresh, and reconnection.     */
/*  Client-side only — use dynamic import if SSR issues arise.         */
/* ------------------------------------------------------------------ */

let clientInstance: TelnyxRTC | null = null
let currentCredKey: string | null = null

export interface TelnyxClientCredentials {
  /** JWT login token (for outbound / ephemeral connections) */
  token?: string
  /** SIP username (for persistent registration — enables inbound) */
  login?: string
  /** SIP password (paired with login) */
  password?: string
}

export interface TelnyxClientOptions extends TelnyxClientCredentials {
  onReady: () => void
  onError: (error: unknown) => void
  onNotification: (notification: TelnyxNotification) => void
  onSocketClose: () => void
}

export interface TelnyxNotification {
  type: string
  call?: unknown
}

function credKey(opts: TelnyxClientCredentials): string {
  return opts.token ?? `${opts.login}:${opts.password}`
}

/**
 * Initialize and connect the TelnyxRTC client.
 * Supports both token-based auth and login/password (SIP credential) auth.
 * If a client already exists with the same credentials, returns it.
 */
export async function initClient(
  options: TelnyxClientOptions,
): Promise<TelnyxRTC> {
  const key = credKey(options)

  // Reuse existing client if credentials unchanged
  if (clientInstance && currentCredKey === key) {
    return clientInstance
  }

  // Disconnect stale client
  if (clientInstance) {
    disconnect()
  }

  // Dynamic import to avoid SSR issues
  const { TelnyxRTC: TelnyxRTCConstructor } = await import("@telnyx/webrtc")

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const constructorOpts: Record<string, any> = {
    env: "production",
  }
  if (options.login && options.password) {
    constructorOpts.login = options.login
    constructorOpts.password = options.password
  } else if (options.token) {
    constructorOpts.login_token = options.token
  }

  console.log("[Telnyx] Constructor opts:", {
    ...constructorOpts,
    password: constructorOpts.password ? "***" : undefined,
  })

  const client = new TelnyxRTCConstructor(constructorOpts)

  // Wire events before connecting
  client.on("telnyx.ready", () => {
    options.onReady()
  })

  client.on("telnyx.error", (error: unknown) => {
    options.onError(error)
  })

  client.on("telnyx.notification", (notification: TelnyxNotification) => {
    options.onNotification(notification)
  })

  client.on("telnyx.socket.close", () => {
    options.onSocketClose()
  })

  client.connect()

  clientInstance = client
  currentCredKey = key

  return client
}

/**
 * Get the current TelnyxRTC client instance (or null if not connected).
 */
export function getClient(): TelnyxRTC | null {
  return clientInstance
}

/**
 * Disconnect and clean up the TelnyxRTC client.
 */
export function disconnect(): void {
  if (clientInstance) {
    try {
      clientInstance.disconnect()
    } catch {
      // Client may already be disconnected
    }
    clientInstance = null
    currentCredKey = null
  }
}

/**
 * Check if the client is currently connected and ready.
 */
export function isConnected(): boolean {
  return clientInstance !== null
}

/**
 * Refresh by disconnecting and reconnecting with new credentials.
 */
export async function refreshToken(
  options: TelnyxClientOptions,
): Promise<TelnyxRTC> {
  disconnect()
  return initClient(options)
}
