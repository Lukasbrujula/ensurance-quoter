import { NextResponse } from "next/server"
import OpenAI from "openai"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { chatLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import type { QuoteRequest, QuoteResponse } from "@/lib/types"

const openai = new OpenAI()

interface ProactiveRequest {
  intakeData: QuoteRequest
  quoteResponse?: QuoteResponse
}

export async function POST(request: Request) {
  const rl = chatLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 },
      )
    }

    const body = (await request.json()) as ProactiveRequest

    if (!body.intakeData) {
      return NextResponse.json(
        { error: "intakeData is required" },
        { status: 400 },
      )
    }

    const systemPrompt = buildSystemPrompt({
      intakeData: body.intakeData,
      quoteResponse: body.quoteResponse,
    })

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
    const message =
      error instanceof Error ? error.message : "Failed to generate insights"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
