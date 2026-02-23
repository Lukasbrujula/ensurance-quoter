import { openai } from "@ai-sdk/openai"
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { chatLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"
import type { QuoteRequest, QuoteResponse } from "@/lib/types"

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.string(),
    content: z.unknown(),
    id: z.string().optional(),
    parts: z.unknown().optional(),
  }).passthrough()).max(100),
  context: z.object({
    intakeData: z.unknown().optional(),
    quoteResponse: z.unknown().optional(),
  }).optional(),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = chatLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return new Response("Service configuration error", { status: 500 })
  }

  let body: z.infer<typeof chatRequestSchema>
  try {
    const raw = await request.json()
    body = chatRequestSchema.parse(raw)
  } catch {
    return new Response("Invalid request", { status: 400 })
  }

  const { messages, context } = body as {
    messages: UIMessage[]
    context?: { intakeData?: unknown; quoteResponse?: unknown }
  }

  const systemPrompt = buildSystemPrompt({
    intakeData: context?.intakeData as QuoteRequest | undefined,
    quoteResponse: context?.quoteResponse as QuoteResponse | undefined,
  })

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
