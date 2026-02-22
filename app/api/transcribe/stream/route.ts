import { createSession, closeSession, sseEvent } from "@/lib/deepgram/sessions"
import { transcribeLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"

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

// TODO(P5): Add auth check — this endpoint costs $0.0077/min on Deepgram
export async function GET(request: Request) {
  const rl = transcribeLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  let sessionId: string | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      try {
        sessionId = createSession(controller)
        controller.enqueue(sseEvent("session_init", { sessionId }))
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create transcription session"

        controller.enqueue(sseEvent("error", { message }))
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
