import { NextResponse } from "next/server"
import { z } from "zod"
import { sendAudio } from "@/lib/deepgram/sessions"
import { audioLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"

/* ------------------------------------------------------------------ */
/*  POST /api/transcribe/audio                                         */
/*  Receives base64-encoded PCM audio and forwards it to the active    */
/*  Deepgram WebSocket for the given session.                          */
/* ------------------------------------------------------------------ */

// 1MB base64 ≈ 750KB raw — well above any legitimate chunk
// (100ms of 16kHz mono Int16 = ~3.2KB raw, ~4.3KB base64)
const MAX_AUDIO_BASE64_LENGTH = 1_048_576

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  audio: z
    .string()
    .min(1)
    .max(MAX_AUDIO_BASE64_LENGTH)
    .regex(BASE64_REGEX, { message: "audio must be valid base64" }),
})

const KNOWN_ERRORS = new Set([
  "Session not found",
  "Deepgram connection is not open",
])

// TODO(P5): Add auth check
export async function POST(request: Request) {
  const rl = audioLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  let body: z.infer<typeof RequestSchema>
  try {
    const raw = await request.json()
    body = RequestSchema.parse(raw)
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid request — sessionId (UUID) and audio (base64, max 1MB) required",
      },
      { status: 400 },
    )
  }

  try {
    const raw = Buffer.from(body.audio, "base64")
    const pcm = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
    sendAudio(body.sessionId, pcm)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message : "Failed to send audio"
    const message = KNOWN_ERRORS.has(rawMessage)
      ? rawMessage
      : "Failed to send audio"
    const status = rawMessage === "Session not found" ? 404 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
