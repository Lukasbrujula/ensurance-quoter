/**
 * Simple sliding-window rate limiter (in-memory).
 * Sufficient for a single-instance deployment.
 */

interface WindowEntry {
  timestamps: number[]
}

const windows = new Map<string, WindowEntry>()
const WINDOW_MS = 60_000

/** Returns true if the request is allowed, false if rate limited. */
export function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now()
  const cutoff = now - WINDOW_MS

  let entry = windows.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    windows.set(key, entry)
  }

  // Purge expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= maxPerMinute) {
    return false
  }

  entry.timestamps.push(now)
  return true
}

// Periodic cleanup of stale keys (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS
  for (const [key, entry] of windows) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) {
      windows.delete(key)
    }
  }
}, 300_000).unref()
