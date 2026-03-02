import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { rateLimit } from "./rate-limit.js"

const app = new Hono()

const PORT = parseInt(process.env.PORT || "3001", 10)
const PROXY_SECRET = process.env.PROXY_SECRET || ""
const COMPULIFE_AUTH_ID = process.env.COMPULIFE_AUTH_ID || ""
const RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM || "60", 10)

const COMPULIFE_API_URL = "https://www.compulifeapi.com/api/request/"
const COMPULIFE_TIMEOUT_MS = 15_000

if (!PROXY_SECRET) {
  console.error("FATAL: PROXY_SECRET is required")
  process.exit(1)
}

if (!COMPULIFE_AUTH_ID) {
  console.error("FATAL: COMPULIFE_AUTH_ID is required")
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() }),
)

// ---------------------------------------------------------------------------
// Quote proxy — GET /api/quote?COMPULIFE={json}
// ---------------------------------------------------------------------------
app.get("/api/quote", async (c) => {
  // Auth
  const secret = c.req.header("x-proxy-secret")
  if (!secret || secret !== PROXY_SECRET) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  // Rate limit by caller IP
  const clientIP = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!rateLimit(clientIP, RATE_LIMIT_RPM)) {
    return c.json({ error: "Rate limited" }, 429)
  }

  // Extract COMPULIFE JSON param
  const compulifeParam = c.req.query("COMPULIFE")
  if (!compulifeParam) {
    return c.json({ error: "Missing COMPULIFE query parameter" }, 400)
  }

  // Parse, inject auth ID, re-encode
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(compulifeParam)
  } catch {
    return c.json({ error: "Invalid JSON in COMPULIFE parameter" }, 400)
  }

  const enriched = {
    ...parsed,
    COMPULIFEAUTHORIZATIONID: COMPULIFE_AUTH_ID,
  }

  const upstreamUrl = `${COMPULIFE_API_URL}?COMPULIFE=${encodeURIComponent(JSON.stringify(enriched))}`

  try {
    const upstream = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(COMPULIFE_TIMEOUT_MS),
    })

    if (!upstream.ok) {
      return c.json(
        { error: `Compulife API returned ${upstream.status}` },
        502,
      )
    }

    // Pass through the response body and content-type as-is
    const contentType = upstream.headers.get("content-type") || "application/json"
    const body = await upstream.text()

    return c.body(body, 200, { "Content-Type": contentType })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    if (message.includes("timeout") || message.includes("abort")) {
      return c.json({ error: "Compulife API timeout" }, 504)
    }

    return c.json({ error: "Compulife API unreachable" }, 502)
  }
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[compulife-proxy] Listening on :${PORT}`)
  console.log(`[compulife-proxy] Auth ID: ${COMPULIFE_AUTH_ID.slice(0, 4)}...`)
})
