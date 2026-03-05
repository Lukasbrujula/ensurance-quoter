import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"

/* ------------------------------------------------------------------ */
/*  GET /api/agents/scrape-preview?url=...                             */
/*  Fetches a URL server-side and extracts visible text.               */
/*  Returns { text: string } or { error: string }.                     */
/* ------------------------------------------------------------------ */

const urlSchema = z.string().url().max(2000)

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
