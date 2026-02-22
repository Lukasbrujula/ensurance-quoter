import { NextResponse } from "next/server"
import OpenAI, { APIUserAbortError } from "openai"
import { z } from "zod"
import { coachingLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { buildCoachingContext } from "@/lib/ai/coaching-context"
import {
  buildCoachingMessages,
  parseCoachingResponse,
  isDuplicateHint,
} from "@/lib/ai/call-coach"
import type { QuoteRequest } from "@/lib/types/quote"

/* ------------------------------------------------------------------ */
/*  POST /api/coaching                                                  */
/*  Real-time coaching hint generation during live calls.               */
/*  5s timeout — skip silently if too slow.                             */
/* ------------------------------------------------------------------ */

const openai = new OpenAI()

const RequestSchema = z.object({
  transcriptChunk: z.string().min(1).max(5000),
  leadProfile: z.object({
    name: z.string().min(1).max(200),
    age: z.number().int().min(18).max(100),
    gender: z.enum(["Male", "Female"]),
    state: z.string().length(2),
    coverageAmount: z.number().positive(),
    termLength: z.number(),
    tobaccoStatus: z.enum(["non-smoker", "smoker"]),
    healthIndicators: z.object({
      bloodPressure: z.string().optional(),
      ldl: z.number().optional(),
      bmi: z.number().optional(),
      preExistingConditions: z.array(z.string()).optional(),
    }).optional(),
    medicalConditions: z.array(z.string()).optional(),
    medications: z.string().optional(),
    duiHistory: z.boolean().optional(),
    yearsSinceLastDui: z.number().nullable().optional(),
  }),
  existingHintTexts: z.array(z.string()).max(20),
})

const TIMEOUT_MS = 5_000

export async function POST(request: Request) {
  const rl = coachingLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 },
      )
    }

    const body: unknown = await request.json()
    const parsed = RequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 },
      )
    }

    const { transcriptChunk, leadProfile, existingHintTexts } = parsed.data

    const carrierContext = buildCoachingContext(
      leadProfile.state,
      leadProfile.age,
    )

    const messages = buildCoachingMessages({
      transcriptChunk,
      leadProfile: leadProfile as QuoteRequest,
      existingHintTexts,
      carrierContext,
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages,
          temperature: 0.5,
          max_tokens: 300,
        },
        { signal: controller.signal },
      )

      const content = completion.choices[0]?.message?.content
      if (!content) {
        return NextResponse.json({ hint: null })
      }

      const hint = parseCoachingResponse(content)

      if (hint && isDuplicateHint(existingHintTexts, hint.text)) {
        return NextResponse.json({ hint: null })
      }

      return NextResponse.json({
        hint,
        usage: {
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    if (
      error instanceof APIUserAbortError ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      return NextResponse.json({ hint: null, timedOut: true })
    }

    return NextResponse.json(
      { error: "Coaching generation failed" },
      { status: 500 },
    )
  }
}
