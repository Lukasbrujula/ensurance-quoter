import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/middleware/csrf"

const isPublicRoute = createRouteMatcher([
  "/",                        // Landing page
  "/pricing",                 // Pricing page
  "/privacy",                 // Privacy policy
  "/terms",                   // Terms of service
  "/support",                 // Support page
  "/auth/(.*)",               // Auth pages
  "/api/ai-agent/(.*)",       // Telnyx AI webhook (signature-verified)
  "/api/webhooks/(.*)",       // SMS webhooks (signature-verified)
  "/api/jobs/(.*)",           // Cron jobs (CRON_SECRET auth)
  "/api/agents/call-complete",    // Telnyx post-call webhook (signature-verified)
  "/api/agents/intake-webhook",   // Telnyx intake webhook (signature-verified)
])

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname

  // CSRF validation for API mutation requests
  if (path.startsWith("/api")) {
    const csrf = validateCSRF(req.method, path, req.headers)
    if (!csrf.valid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
