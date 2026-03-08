# UA-02: System Prompt + Compulife Tool Integration

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

---

## 1. Model
Sonnet — API endpoint + system prompt engineering + tool calling

## 2. Tools
- Antigravity (Claude Code)
- Terminal (`bunx tsc --noEmit`)

## 3. Guardrails
- ❌ Do NOT modify the existing `/api/chat` endpoint — create a new `/api/assistant/chat` endpoint
- ❌ Do NOT hardcode carrier data as a giant string in the API route — load it dynamically from the data files
- ❌ Do NOT make Compulife calls from the client — all pricing queries go through the server-side tool
- ❌ Do NOT expose raw Compulife API responses to the LLM — parse and format them into readable data first
- ❌ Do NOT let the chatbot give definitive medical advice — it should always say "based on our carrier guide data" and recommend verifying with the carrier
- ✅ DO use OpenAI function calling / tools for Compulife pricing lookups
- ✅ DO use the existing Compulife provider pattern (`lib/engine/compulife-provider.ts` or `lib/engine/pricing.ts`)
- ✅ DO stream responses using the same Vercel AI SDK pattern as existing `/api/chat`

## 4. Knowledge

### System Prompt Strategy
The system prompt has two layers:

**Layer 1: Static carrier intelligence (injected at request time)**
Load from your carrier data files and format as structured context:
- Tobacco classification matrix (all carriers × all nicotine types)
- State availability (which carriers operate where)
- Medical conditions matrix (which carriers accept/decline which conditions)
- DUI rules per carrier
- Prescription screening data (AMAM 495 drugs, MOO 119 drugs)
- Product parameters (age ranges, face amounts, term lengths)
- Living benefits and riders
- Operational info (e-sign, telesales, payment methods)
- Key differentiators per carrier

**Layer 2: Dynamic pricing via tool calling**
When the agent asks about rates or pricing, the LLM calls a `get_quote` tool that hits your existing quote engine (which routes through Compulife proxy if available, mock pricing as fallback).

### Tool Definition
```typescript
{
  type: "function",
  function: {
    name: "get_quote",
    description: "Get life insurance premium quotes from carriers. Use this when the user asks about pricing, rates, premiums, or cost comparisons. Returns monthly and annual premiums from available carriers.",
    parameters: {
      type: "object",
      properties: {
        age: { type: "number", description: "Applicant age (18-85)" },
        gender: { type: "string", enum: ["male", "female"] },
        state: { type: "string", description: "Two-letter state code (e.g., TX, NY, CA)" },
        coverage_amount: { type: "number", description: "Face amount in dollars (e.g., 500000)" },
        term_years: { type: "number", description: "Term length in years (10, 15, 20, 25, 30)" },
        tobacco_status: { type: "string", enum: ["non_smoker", "smoker"], description: "Tobacco/nicotine user status" },
        health_class: { type: "string", enum: ["preferred_plus", "preferred", "standard", "substandard"], description: "Health classification. Default to standard if unknown." }
      },
      required: ["age", "gender", "state", "coverage_amount", "term_years", "tobacco_status"]
    }
  }
}
```

### Tool Execution
When the LLM calls `get_quote`, your backend:
1. Calls the existing pricing provider (Compulife proxy → fallback to mock)
2. Formats the results as a readable table
3. Returns it to the LLM to incorporate into its response

### System Prompt Template
```
You are the Ensurance Underwriting Assistant — an expert AI tool for life insurance agents. You help agents quickly find the right carriers for their clients by answering questions about underwriting rules, pricing, state availability, and carrier policies.

## Your Knowledge

You have access to detailed underwriting intelligence for {N} carriers, sourced from official carrier guides and agent training materials. This data includes:
- Tobacco/nicotine classification rules
- Medical condition acceptance/decline policies
- Prescription drug screening lists
- DUI/driving record policies
- State availability
- Product parameters (age ranges, face amounts, term lengths)
- Living benefits and rider information

## How to Respond

1. When asked about underwriting rules (tobacco, medical, DUI, etc.), answer from the carrier data provided below.
2. When asked about pricing or rates, use the get_quote tool to fetch real carrier premiums.
3. Always specify which carriers you're referencing.
4. When highlighting a carrier advantage, explain WHY it matters (e.g., "Foresters gives non-smoker rates to vapers — this can save your client 50%+ on premiums compared to carriers that charge tobacco rates").
5. If data is missing for a carrier or condition, say so — don't guess.
6. Always remind agents to verify with the carrier before submitting applications, as underwriting guidelines can change.
7. Be concise but thorough. Agents are busy.
8. Format responses with clear structure — use bold for carrier names, bullet points for comparisons.

## Carrier Intelligence Data

{CARRIER_DATA_INJECTED_HERE}
```

### How to Load Carrier Data
Read from the existing data files at request time:
```bash
# Find where carrier data lives
cat lib/data/carriers.ts | head -50
cat lib/data/carriers-generated.ts | head -50
cat lib/data/medical-conditions.ts | head -50
```

Build a function like `buildAssistantContext()` that:
1. Loads all carriers with their intelligence data
2. Formats tobacco matrix as a readable table
3. Formats medical conditions as carrier-grouped lists
4. Formats state availability
5. Formats DUI rules
6. Returns one big string to inject into the system prompt

This should be cached (computed once, reused) since carrier data doesn't change at runtime.

## 5. Memory
- Existing chat endpoint is at `app/api/chat/route.ts` — uses Vercel AI SDK (`streamText` or `createStreamableValue`), OpenAI GPT-4o-mini
- Existing pricing provider is at `lib/engine/pricing.ts` or `lib/engine/compulife-provider.ts` — has a `getQuotes()` function or similar
- The mock pricing fallback is in `lib/engine/mock-pricing.ts`
- `OPENAI_API_KEY` is already configured
- `COMPULIFE_PROXY_URL` and `COMPULIFE_PROXY_SECRET` are configured in Vercel
- Carrier data is in `lib/data/carriers.ts` or `lib/data/carriers-generated.ts` — check which one is the current source of truth

## 6. Success Criteria
- [ ] `/api/assistant/chat` endpoint exists with POST handler
- [ ] System prompt includes all carrier intelligence data (tobacco, medical, state, DUI, prescriptions)
- [ ] `get_quote` tool is defined and callable by the LLM
- [ ] Tool execution calls the existing pricing provider and returns formatted results
- [ ] Responses stream to the client (not buffered)
- [ ] Chat interface from UA-01 is wired to this new endpoint (replace mock responses)
- [ ] Test: "Which carriers accept vapers as non-smokers?" → response mentions Foresters with specific details
- [ ] Test: "What are rates for a 30M non-smoker in Texas, $500K 20yr?" → response includes actual premiums from multiple carriers
- [ ] Test: "Can I place a client with bipolar disorder?" → response mentions John Hancock's acceptance with details
- [ ] Test: "Which carriers don't operate in New York?" → response lists AMAM, Americo, UHL, etc.
- [ ] Fallback: if Compulife proxy is down, mock pricing is used (not an error)
- [ ] `bunx tsc --noEmit` passes clean

## 7. Dependencies

**Files to read first:**
```bash
cat app/api/chat/route.ts                        # Existing chat streaming pattern
cat lib/engine/pricing.ts                        # Pricing provider interface
cat lib/engine/compulife-provider.ts             # Compulife integration (if exists)
cat lib/engine/mock-pricing.ts                   # Mock fallback
cat lib/data/carriers.ts | head -100             # Carrier data structure
cat lib/data/carriers-generated.ts | head -100   # Alternative carrier data
cat lib/data/medical-conditions.ts | head -50    # Medical conditions
cat components/assistant/chat-interface.tsx       # UA-01 chat UI (to wire up)
```

**Files to create:**
- `app/api/assistant/chat/route.ts` — streaming chat endpoint with tool calling
- `lib/assistant/build-context.ts` — function to compile carrier data into system prompt context
- `lib/assistant/tools.ts` — tool definitions and execution handlers

**Files to modify:**
- `components/assistant/chat-interface.tsx` — replace mock response with real API call (use `useChat` hook from Vercel AI SDK)

## 8. Failure Handling

| Error | Cause | Solution |
|-------|-------|----------|
| System prompt too large (token limit) | Too much carrier data | Prioritize: tobacco matrix + medical conditions + state availability + DUI rules. Prescription lists can be summarized ("AMAM screens 495 medications — ask me about specific drugs"). |
| `get_quote` tool returns empty | Compulife proxy down + mock pricing fails | Return a message: "Pricing data temporarily unavailable. I can still help with underwriting rules." |
| LLM hallucinates carrier data | Not grounded in provided context | Strengthen system prompt: "ONLY answer from the carrier data provided below. If the data doesn't cover a question, say 'I don't have data on that carrier/condition.'" |
| Streaming breaks | Wrong Vercel AI SDK usage | Match the exact pattern from the existing `/api/chat` endpoint |
| Tool calling not working | OpenAI model doesn't support tools | GPT-4o-mini supports tools. Verify the tool schema matches OpenAI's expected format. |
| Carrier data file not found | Wrong import path | Check both `carriers.ts` and `carriers-generated.ts` — grep for the actual export names |

## 9. Learning
- The system prompt context size is the main constraint. GPT-4o-mini has 128K context but bigger prompts = slower + more expensive. Aim for the most useful data, not all data.
- Tool calling adds latency (LLM decides to call tool → your server executes → result back to LLM → final response). Warn the user with a "Fetching pricing data..." indicator.
- If the carrier data structure has changed since the DATA_REFERENCE.md was written, document the actual structure for future tasks.
- Compulife returns HTML-formatted tables, not JSON — the proxy or provider may need to parse this. Check what `compulife-provider.ts` actually returns.

---

## On Completion
- Commit: `feat: underwriting assistant AI with carrier intelligence and Compulife pricing`
- Test all 4 scenarios from Success Criteria
- Proceed to UA-03
