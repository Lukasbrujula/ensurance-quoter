import { createAuthClient } from "@/lib/supabase/auth-server"
import { NextResponse } from "next/server"

/** Allow only safe relative paths — block absolute URLs, protocol-relative,
 *  backslash tricks (`/\evil.com`), and special-prefix paths (`/@attacker`). */
function sanitizeRedirect(raw: string | null): string {
  if (!raw) return "/dashboard"
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard"
  // Block paths that start with /@ /\ or contain backslash
  if (/^\/[\\@]/.test(raw) || raw.includes("\\")) return "/dashboard"
  return raw
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  // Supabase OAuth may use "next" or "redirect" as the redirect param
  const redirect = sanitizeRedirect(
    searchParams.get("redirect") ?? searchParams.get("next"),
  )

  if (code) {
    const supabase = await createAuthClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(new URL(redirect, request.url))
}
