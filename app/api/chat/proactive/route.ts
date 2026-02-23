import { NextResponse } from "next/server"
import OpenAI from "openai"
import { z } from "zod"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"
import type { QuoteRequest, QuoteResponse } from "@/lib/types"

const proactiveSchema = z.object({
  intakeData: z.object({
    name: z.string().max(200).optional(),
    age: z.number().int().min(0).max(150).optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    state: z.string().max(2).optional(),
    coverageAmount: z.number().optional(),
    termLength: z.number().optional(),
    tobaccoStatus: z.enum(["non-smoker", "smoker"]).optional(),
  }).passthrough(),
  quoteResponse: z.unknown().optional(),
})

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

    let body: z.infer<typeof proactiveSchema>
    try {
      const raw = await request.json()
      body = proactiveSchema.parse(raw)
    } catch {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 },
      )
    }

    const systemPrompt = buildSystemPrompt({
      intakeData: body.intakeData as QuoteRequest,
      quoteResponse: body.quoteResponse as QuoteResponse | undefined,
    })

    const openai = new OpenAI()
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Given this client profile, generate 2-4 short actionable insights for the insurance agent. Each insight should be specific to THIS client's situation and reference specific carrier names and rules.

Return JSON in this exact format:
{
  "insights": [
    {
      "id": "unique-id",
      "type": "warning" | "tip" | "info",
      "title": "Short title (max 8 words)",
      "body": "One sentence explanation with specific carrier/rule reference."
    }
  ]
}

Use "warning" for potential issues (state restrictions, DUI concerns, medical flags).
Use "tip" for opportunities (better rates, special programs, lenient carriers).
Use "info" for neutral facts (carrier availability, conversion options).`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 },
      )
    }

    const parsed = JSON.parse(content) as { insights: unknown[] }

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof Error) {
      console.error("[chat/proactive] Insight generation failed:", error.message)
    }
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}
