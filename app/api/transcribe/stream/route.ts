import { createSession, closeSession, sseEvent } from "@/lib/deepgram/sessions"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"

/* ------------------------------------------------------------------ */
/*  GET /api/transcribe/stream                                         */
/*  SSE endpoint — opens a Deepgram live transcription session and     */
/*  streams transcript events back to the client.                      */
/*                                                                     */
/*  Events sent:                                                       */
/*    session_init  — { sessionId }                                    */
/*    session_ready — { sessionId } (Deepgram WS connected)            */
/*    transcript    — TranscriptEntry JSON                             */
/*    utterance_end — { timestamp }                                    */
/*    error         — { message }                                      */
/*    close         — { sessionId }                                    */
/* ------------------------------------------------------------------ */

// Long-lived SSE stream — requires Node.js runtime (not edge)
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.ai, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  let sessionId: string | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        sessionId = createSession(controller)
        controller.enqueue(sseEvent("session_init", { sessionId }))
      } catch (error) {
        if (error instanceof Error) {
          console.error("[transcribe/stream] Session creation failed:", error.message)
        }
        controller.enqueue(sseEvent("error", { message: "Failed to create transcription session" }))
        controller.close()
      }
    },
    cancel() {
      if (sessionId) {
        closeSession(sessionId)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
