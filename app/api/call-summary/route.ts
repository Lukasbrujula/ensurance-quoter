import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { z } from "zod"
import { callSummaryLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"

const requestSchema = z.object({
  transcript: z.string().min(1).max(100_000),
})

export async function POST(request: Request) {
  const rl = callSummaryLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request: transcript is required" },
      { status: 400 },
    )
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "You are a call summarization assistant for an insurance agency. " +
        "Summarize the following insurance sales call transcript in exactly 3 sentences. " +
        "Focus on: (1) what was discussed, (2) any health or lifestyle disclosures the client made, " +
        "and (3) the outcome of the call. Be concise and factual. Do not include opinions or recommendations.",
      prompt: parsed.data.transcript,
      maxOutputTokens: 200,
    })

    return Response.json({ summary: text.trim() })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Summary generation failed"
    return Response.json({ error: message }, { status: 500 })
  }
}
