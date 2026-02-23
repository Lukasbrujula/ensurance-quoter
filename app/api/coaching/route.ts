import { NextResponse } from "next/server"
import OpenAI, { APIUserAbortError } from "openai"
import { z } from "zod"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { buildCoachingSystemPrompt } from "@/lib/coaching/build-coaching-prompt"
import { CoachingResponseSchema } from "@/lib/types/coaching"

/* ------------------------------------------------------------------ */
/*  POST /api/coaching                                                  */
/*  Real-time coaching card generation during live calls.               */
/*  5s timeout — skip silently if too slow.                             */
/*                                                                      */
/*  BREAKING CHANGE (T11.1a): Response shape changed from               */
/*  { hint: CoachingHint | null } to { cards: CoachingCard[] }.         */
/*  Frontend callers (use-coaching-interval.ts) need updating in        */
/*  T11.1c to consume the new shape.                                    */
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
const MAX_CARDS = 3

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.ai, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

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

    const profileSummary = [
      `Client: ${leadProfile.name}, age ${leadProfile.age}, ${leadProfile.gender}`,
      `State: ${leadProfile.state}`,
      `Coverage: $${leadProfile.coverageAmount.toLocaleString("en-US")}, ${leadProfile.termLength}yr term`,
      `Tobacco: ${leadProfile.tobaccoStatus}`,
      leadProfile.duiHistory
        ? `DUI: Yes (${leadProfile.yearsSinceLastDui ?? "unknown"} years ago)`
        : null,
      leadProfile.medicalConditions?.length
        ? `Medical: ${leadProfile.medicalConditions.join(", ")}`
        : null,
      leadProfile.medications
        ? `Medications: ${leadProfile.medications}`
        : null,
    ]
      .filter(Boolean)
      .join("\n")

    const existingContext =
      existingHintTexts.length > 0
        ? `\n\nAlready provided cards (do NOT repeat similar content):\n${existingHintTexts.map((t) => `- ${t}`).join("\n")}`
        : ""

    const systemPrompt = buildCoachingSystemPrompt()

    const userMessage = `Client Profile:
${profileSummary}
${existingContext}

---
Latest transcript:
"${transcriptChunk}"

Analyze and respond with JSON.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const completion = await openai.chat.completions.create(
        {
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.4,
          max_tokens: 800,
        },
        { signal: controller.signal },
      )

      const content = completion.choices[0]?.message?.content
      if (!content) {
        return NextResponse.json({ cards: [] })
      }

      let raw: unknown
      try {
        raw = JSON.parse(content)
      } catch {
        return NextResponse.json({ cards: [] })
      }

      const validated = CoachingResponseSchema.safeParse(raw)
      if (!validated.success) {
        return NextResponse.json({ cards: [] })
      }

      // Add id + timestamp server-side, truncate to MAX_CARDS
      const cards = validated.data.cards.slice(0, MAX_CARDS).map((card) => ({
        ...card,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }))

      return NextResponse.json({
        cards,
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
      return NextResponse.json({ cards: [], timedOut: true })
    }

    return NextResponse.json(
      { error: "Coaching generation failed" },
      { status: 500 },
    )
  }
}
