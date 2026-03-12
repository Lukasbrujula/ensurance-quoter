import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { lookup } from "dns/promises"

/* ------------------------------------------------------------------ */
/*  GET /api/agents/scrape-preview?url=...                             */
/*  Fetches a URL server-side and extracts visible text.               */
/*  Returns { text: string } or { error: string }.                     */
/* ------------------------------------------------------------------ */

const urlSchema = z.string().url().max(2000)

/* ------------------------------------------------------------------ */
/*  SSRF Protection — block private/reserved IP ranges                 */
/* ------------------------------------------------------------------ */

/** Blocked hostnames that should never be fetched server-side. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.internal",
])

/** Check if an IPv4 address falls in a private/reserved range. */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true

  const [a, b] = parts as [number, number, number, number]

  // 127.0.0.0/8 — loopback
  if (a === 127) return true
  // 10.0.0.0/8 — private
  if (a === 10) return true
  // 172.16.0.0/12 — private
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16 — private
  if (a === 192 && b === 168) return true
  // 169.254.0.0/16 — link-local / cloud metadata
  if (a === 169 && b === 254) return true
  // 0.0.0.0/8
  if (a === 0) return true

  return false
}

/** Check if an IPv6 address is loopback or private. */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase()
  // ::1 loopback
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true
  // fc00::/7 — unique local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true
  // fe80::/10 — link-local
  if (normalized.startsWith("fe80")) return true
  return false
}

/**
 * Validate that a URL is safe to fetch (not targeting internal resources).
 * Resolves the hostname to an IP and checks against blocklists.
 */
async function validateUrlForSsrf(url: string): Promise<{ safe: boolean; reason?: string }> {
  const parsed = new URL(url)

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: "Only http and https protocols are allowed" }
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "") // Strip IPv6 brackets

  // Block known dangerous hostnames
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    return { safe: false, reason: "Blocked hostname" }
  }

  // If hostname is a raw IP, check directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    if (isPrivateIPv4(hostname)) {
      return { safe: false, reason: "Private IP address not allowed" }
    }
    return { safe: true }
  }
  if (hostname.includes(":") || isPrivateIPv6(hostname)) {
    return { safe: false, reason: "Private IP address not allowed" }
  }

  // Resolve hostname to IP and check the resolved address
  try {
    const { address, family } = await lookup(hostname)
    if (family === 4 && isPrivateIPv4(address)) {
      return { safe: false, reason: "Hostname resolves to private IP" }
    }
    if (family === 6 && isPrivateIPv6(address)) {
      return { safe: false, reason: "Hostname resolves to private IP" }
    }
  } catch {
    return { safe: false, reason: "Failed to resolve hostname" }
  }

  return { safe: true }
}

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { searchParams } = new URL(request.url)
    const rawUrl = searchParams.get("url")

    const parsed = urlSchema.safeParse(rawUrl)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 },
      )
    }

    const url = parsed.data

    // SSRF protection: block private IPs and cloud metadata endpoints
    const ssrfCheck = await validateUrlForSsrf(url)
    if (!ssrfCheck.safe) {
      return NextResponse.json(
        { error: "URL not allowed" },
        { status: 400 },
      )
    }

    // Fetch with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Ensurance/1.0; +https://ensurance.app)",
        Accept: "text/html, text/plain",
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json(
        { error: `Website returned ${res.status}` },
        { status: 422 },
      )
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return NextResponse.json(
        { error: "URL does not point to an HTML or text page" },
        { status: 422 },
      )
    }

    const html = await res.text()

    // Strip HTML tags and extract visible text (best effort)
    const text = extractText(html)

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No text content found" },
        { status: 422 },
      )
    }

    // Cap at 3000 chars to be reasonable
    const trimmed = text.length > 3000 ? text.slice(0, 3000) + "..." : text

    return NextResponse.json({ text: trimmed })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out" },
        { status: 408 },
      )
    }
    console.error(
      "scrape-preview error:",
      error instanceof Error ? error.message : String(error),
    )
    return NextResponse.json(
      { error: "Failed to fetch website" },
      { status: 500 },
    )
  }
}

/* ------------------------------------------------------------------ */
/*  Simple HTML → text extractor                                       */
/* ------------------------------------------------------------------ */

function extractText(html: string): string {
  // Remove script, style, and noscript blocks
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")

  // Replace block elements with newlines
  cleaned = cleaned.replace(/<\/(p|div|h[1-6]|li|tr|br\s*\/?)>/gi, "\n")
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n")

  // Remove remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ")

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")

  // Collapse whitespace
  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n")

  return cleaned
}
