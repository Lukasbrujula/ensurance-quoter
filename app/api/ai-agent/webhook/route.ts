import { z } from "zod"
import { NextResponse } from "next/server"
import {
  aiAgentWebhookLimiter,
  getRateLimitKey,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { createServerClient } from "@/lib/supabase/server"
import { getAIAgentSettings } from "@/lib/supabase/settings"
import {
  getAgentByTelnyxAssistantId,
  incrementAgentStats,
  insertTranscriptMessages,
} from "@/lib/supabase/ai-agents"
import { getConversations, getTranscript } from "@/lib/telnyx/ai-service"
import type { TelnyxTranscriptMessage } from "@/lib/telnyx/ai-types"
import { processAICallToLead } from "@/lib/telnyx/ai-lead-processor"

/* ------------------------------------------------------------------ */
/*  Payload schema — matches T7.2 webhook tool body_parameters         */
/* ------------------------------------------------------------------ */

const webhookPayloadSchema = z.object({
  caller_name: z.string().min(1).max(200),
  callback_number: z.string().max(30).optional(),
  reason: z.string().min(1).max(1000),
  callback_time: z.string().max(200).optional(),
  age_range: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  urgency: z.enum(["low", "medium", "high"]).optional().default("low"),
  notes: z.string().max(2000).optional(),
})

export type AIAgentWebhookPayload = z.infer<typeof webhookPayloadSchema>

/* ------------------------------------------------------------------ */
/*  POST /api/ai-agent/webhook                                         */
/*  Called BY Telnyx AI (not by authenticated users).                   */
/*  agent_id (user) + ai_agent_id (specific agent) passed as query.    */
/*  Returns 200 quickly — Telnyx has timeout limits.                    */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const rl = aiAgentWebhookLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    // Extract IDs from query parameters
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agent_id")
    const aiAgentId = searchParams.get("ai_agent_id")

    if (!agentId) {
      return NextResponse.json(
        { error: "Missing agent_id parameter" },
        { status: 400 },
      )
    }

    // Validate agent_id is a UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(agentId)) {
      return NextResponse.json(
        { error: "Invalid agent_id format" },
        { status: 400 },
      )
    }

    // Resolve the Telnyx assistant ID — Phase 8 (ai_agents table) or Phase 7 fallback
    let assistantId: string | null = null
    let resolvedAiAgentId: string | null = aiAgentId ?? null

    if (aiAgentId && uuidRegex.test(aiAgentId)) {
      // Phase 8: look up specific AI agent
      const { getAgent } = await import("@/lib/supabase/ai-agents")
      const aiAgent = await getAgent(agentId, aiAgentId)
      if (aiAgent) {
        assistantId = aiAgent.telnyx_assistant_id
      }
    }

    // Fallback: Phase 7 settings (backward compatibility)
    if (!assistantId) {
      const settings = await getAIAgentSettings(agentId)
      assistantId = settings.assistantId

      // Try to resolve ai_agent_id from telnyx_assistant_id
      if (assistantId && !resolvedAiAgentId) {
        const agentRecord = await getAgentByTelnyxAssistantId(assistantId)
        if (agentRecord) {
          resolvedAiAgentId = agentRecord.id
        }
      }
    }

    if (!assistantId) {
      return NextResponse.json(
        { error: "No AI assistant configured for this agent" },
        { status: 404 },
      )
    }

    // Parse and validate the webhook payload
    const body = await request.json()
    const parsed = webhookPayloadSchema.safeParse(body)

    if (!parsed.success) {
      console.error(
        "AI agent webhook validation error:",
        parsed.error.flatten(),
      )
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      )
    }

    const data = parsed.data

    // Store in ai_agent_calls table (with ai_agent_id if available)
    const supabase = createServerClient()
    const { data: callRecord, error: insertError } = await supabase
      .from("ai_agent_calls")
      .insert({
        agent_id: agentId,
        ai_agent_id: resolvedAiAgentId,
        caller_name: data.caller_name,
        callback_number: data.callback_number ?? null,
        reason: data.reason,
        callback_time: data.callback_time ?? null,
        age_range: data.age_range ?? null,
        state: data.state ?? null,
        urgency: data.urgency,
        notes: data.notes ?? null,
        processed: false,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("Failed to store AI agent call:", insertError)
      return NextResponse.json(
        { error: "Failed to store call data" },
        { status: 500 },
      )
    }

    // Process into a CRM lead (non-blocking — return 200 first)
    processAICallToLead({
      agentId,
      callRecordId: callRecord.id,
      data,
    }).catch((error) => {
      console.error("Failed to process AI call into lead:", error)
    })

    // Best-effort: fetch transcript from Telnyx + store in ai_transcripts (non-blocking)
    enrichWithTranscript(
      callRecord.id,
      assistantId,
      agentId,
      resolvedAiAgentId,
      supabase,
    ).catch((error) => {
      console.error("Failed to enrich AI call with transcript:", error)
    })

    // Return 200 quickly so Telnyx doesn't retry
    return NextResponse.json({ success: true, callId: callRecord.id })
  } catch (error) {
    console.error("POST /api/ai-agent/webhook error:", error)
    // Still return 200 to prevent Telnyx retry storms
    return NextResponse.json({ received: true })
  }
}

/* ------------------------------------------------------------------ */
/*  Best-effort transcript enrichment                                   */
/*  Phase 8: also stores messages in ai_transcripts + updates stats    */
/* ------------------------------------------------------------------ */

async function enrichWithTranscript(
  callRecordId: string,
  assistantId: string,
  agentId: string,
  aiAgentId: string | null,
  supabase: ReturnType<typeof createServerClient>,
): Promise<void> {
  // Find the most recent conversation for this assistant
  const conversations = await getConversations(assistantId, {
    page_size: 1,
  })

  if (conversations.length === 0) return

  const conversation = conversations[0]!
  const transcriptMessages = await getTranscript(conversation.id)
  const transcriptText = formatTranscriptMessages(transcriptMessages)

  // Update the call record with the flat transcript text
  await supabase
    .from("ai_agent_calls")
    .update({
      telnyx_conversation_id: conversation.id,
      transcript: transcriptText,
    })
    .eq("id", callRecordId)

  // Phase 8: Store individual messages in ai_transcripts table
  if (aiAgentId && transcriptMessages.length > 0) {
    const messages = transcriptMessages.map((m) => ({
      role: m.role as "assistant" | "user" | "system",
      content: m.content,
      timestamp: m.timestamp ?? m.created_at ?? null,
    }))

    await insertTranscriptMessages(
      callRecordId,
      aiAgentId,
      agentId,
      messages,
    ).catch((error) => {
      console.error("Failed to store transcript messages:", error)
    })

    // Update ai_agent stats (total_calls, total_minutes, last_call_at)
    const durationMinutes = conversation.duration_seconds
      ? conversation.duration_seconds / 60
      : 0

    await incrementAgentStats(aiAgentId, durationMinutes).catch((error) => {
      console.error("Failed to increment agent stats:", error)
    })
  }
}

function formatTranscriptMessages(
  messages: TelnyxTranscriptMessage[],
): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" ? "AI" : "Caller"
      return `${role}: ${m.content}`
    })
    .join("\n")
}
