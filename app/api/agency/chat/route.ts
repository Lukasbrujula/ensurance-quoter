import { openai } from "@ai-sdk/openai"
import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { z } from "zod"
import { auth, clerkClient } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { createAgencyTools } from "@/lib/agency/tools"

const requestSchema = z.object({
  messages: z
    .array(
      z
        .object({
          role: z.string(),
          content: z.unknown(),
          id: z.string().optional(),
          parts: z.unknown().optional(),
        })
        .passthrough(),
    )
    .max(100),
})

function buildSystemPrompt(agentNames: Map<string, string>): string {
  const teamList =
    agentNames.size > 0
      ? [...agentNames.entries()]
          .map(([id, name]) => `- ${name} (ID: ${id})`)
          .join("\n")
      : "No team members found."

  return `You are the Ensurance Agency Management Assistant — an AI-powered operations advisor for insurance agency owners. You help the agency admin understand team performance, identify issues, and make decisions about lead distribution and agent management.

## Your Role

You are a data-driven operations advisor. You:
- Analyze team metrics and surface actionable insights
- Identify underperformers, stale leads, and missed follow-ups
- Recommend lead distribution strategies based on workload
- Provide weekly/monthly performance summaries
- Flag risks and opportunities proactively

## Available Tools

You have access to real-time agency data through these tools:
- **get_team_stats**: Overall team performance — leads, calls, close rate, pipeline, per-agent breakdown
- **get_agent_activity**: Activity history per agent or team-wide — calls, quotes, notes, etc.
- **get_stale_leads**: Leads with no activity in 24+ hours, grouped by agent
- **get_overdue_followups**: Missed follow-up commitments, grouped by agent
- **get_unassigned_leads**: Leads in the unassigned pool waiting for assignment

## How to Respond

1. **Always use tools** when asked about data. Never guess metrics — fetch them.
2. **Lead with insights**, not raw data. Explain what the numbers mean.
3. **Be direct and actionable**. Say "Sarah has 5 overdue follow-ups — she may need support" not "Here is a list of follow-ups."
4. **Compare agents fairly**. Different workloads mean different expectations.
5. **Recommend specific actions** when possible — "Assign the 3 unassigned leads to Mike, he has the lightest load this week."
6. **Use tables** for comparisons, **bold** for emphasis, bullet points for lists.
7. **Format concisely** — agency owners are busy.

## Grounding Rules

- ONLY report data returned by your tools. Never invent metrics.
- If a tool returns no data or an error, say so clearly.
- If asked about something your tools don't cover, say "I don't have a tool to check that — but here's what I can do for you."
- Do NOT make up agent names, lead counts, or performance metrics.

## Team Members

${teamList}

## Tone

Professional but approachable. Think trusted business advisor, not formal report. Use the agent's first name when referencing team members.`
}

export async function POST(request: Request) {
  const { userId, orgId, orgRole } = await auth()

  if (!userId || !orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (orgRole !== "org:admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 })
  }

  const rl = await checkRateLimit(rateLimiters.ai, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  if (!process.env.OPENAI_API_KEY) {
    return new Response("Service configuration error", { status: 500 })
  }

  let body: z.infer<typeof requestSchema>
  try {
    const raw = await request.json()
    body = requestSchema.parse(raw)
  } catch {
    return new Response("Invalid request", { status: 400 })
  }

  // Fetch org members for agent name resolution
  const agentNames = new Map<string, string>()
  try {
    const clerk = await clerkClient()
    const members = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    })
    for (const m of members.data) {
      const user = m.publicUserData
      if (user?.userId) {
        const name =
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          user.identifier ||
          user.userId.slice(0, 8)
        agentNames.set(user.userId, name)
      }
    }
  } catch {
    // Proceed without names — tools will show truncated IDs
  }

  const messages = body.messages as UIMessage[]
  const modelMessages = await convertToModelMessages(messages)

  const tools = createAgencyTools(orgId, agentNames)

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: buildSystemPrompt(agentNames),
    messages: modelMessages,
    tools,
    temperature: 0,
  })

  return result.toUIMessageStreamResponse()
}
