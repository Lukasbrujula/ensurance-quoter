import { openai } from "@ai-sdk/openai"
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { chatLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import type { QuoteRequest, QuoteResponse } from "@/lib/types"

export async function POST(request: Request) {
  const rl = chatLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response("OPENAI_API_KEY not configured", { status: 500 })
  }

  const body = await request.json()

  const { messages, context } = body as {
    messages: UIMessage[]
    context?: {
      intakeData?: QuoteRequest
      quoteResponse?: QuoteResponse
    }
  }

  const systemPrompt = buildSystemPrompt({
    intakeData: context?.intakeData,
    quoteResponse: context?.quoteResponse,
  })

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
