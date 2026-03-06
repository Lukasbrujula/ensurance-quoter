# Task: UNIFIED-AGENT-PROMPT-TEMPLATE

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `npx tsc --noEmit`
- [x] Grep, Glob (search)

### 3. Guardrails (DO NOT)
- [ ] Do NOT use Llama model — must be `Qwen/Qwen3-235B-A22B`
- [ ] Do NOT include markdown, bullets, or numbered lists in voice prompts — TTS reads them literally
- [ ] Do NOT use meta-instruction labels like "NOTE:" or "INSTRUCTION:" in prompt text — AI may read them aloud
- [ ] Do NOT stack multiple questions in one agent turn
- [ ] Do NOT modify quote engine, leads, or auth files

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md
- [x] CODEBASE_AUDIT.md — find where system prompt is currently built for Telnyx agents
- [ ] Read current prompt generation logic (search codebase for `systemPrompt` or `instructions` near Telnyx payload)

**Voice prompt engineering rules (from production research):**
- Responses must be 60-70% shorter than text equivalents — instruct: "Keep responses under 3 sentences"
- One question per turn — never stack
- Use natural filler words for latency: "Let me check on that", "One moment"
- Every caller type needs an explicit path — undefined scenarios get force-fit into wrong flows
- Required fields must be marked explicitly with "ALWAYS" or "Required"
- Goal-based, not script-based — "You need X and Y — only ask what's missing"
- Every tool needs a fallback path — assume 10-20% failure rate
- Close the information loop — never state a negative without a positive alternative

**Prompt skeleton (required structure):**
```
# Output Format
You are speaking on a live phone call. Output ONLY the words you want to say.
Do NOT wrap responses in JSON, tool calls, or any structured format.

# Disclosure
[AI disclosure within first 30 seconds]

# Conversation Flow
[Scenarios with triggers, goals, required fields, fallbacks]

# Business Information
[Injected from agent config: name, phone, hours]

# General Rules
- Keep responses under 3 sentences
- Ask one question at a time
- Plain conversational speech only — no formatting
```

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] A `buildInboundAgentPrompt(config: AgentConfig): string` function exists in `lib/agents/prompt-builder.ts` (or equivalent path)
- [ ] The function accepts: businessName, agentName, greeting, businessHours, transferPhone, knowledgeBase (string), language
- [ ] The generated prompt includes: AI disclosure, scheduling scenario, FAQ scenario, insurance intake scenario, lead capture goal, fallback for failed transfers
- [ ] No markdown formatting in the generated prompt output (verify by inspecting the string)
- [ ] `npx tsc --noEmit` passes clean

### 7. Dependencies
- [ ] Task 01 (CONSOLIDATE-AGENT-TYPES) complete — unified agent type must exist before building its prompt

### 8. Failure Handling
**Max attempts:** 3

**On failure:**
- Attempt 1: Retry
- Attempt 2: Simplify — build a static prompt string with interpolation only, no complex logic
- Attempt 3: Save error to `ERRORS/task-02.md` and STOP

**Rollback:** `git stash && git checkout HEAD~1`

---

## Description
Builds the system prompt generator for the unified Inbound Agent. The prompt covers all three previous agent type functions (FAQ, scheduling, insurance intake) in a single well-structured prompt following production-verified voice prompt engineering principles. The function is a pure TypeScript function that takes agent config and returns a string — no side effects, easy to test.

## Acceptance Criteria
- [ ] `buildInboundAgentPrompt()` function created and exported
- [ ] Prompt covers: greeting with AI disclosure, FAQ handling, appointment scheduling, insurance intake (name, phone, coverage interest), lead capture, human transfer fallback, wrong number handling
- [ ] Prompt uses natural language instructions — no meta-labels, no markdown
- [ ] Language parameter supported (en / es) — prompt language switches accordingly
- [ ] Function is wired into the Telnyx assistant creation payload (replaces current prompt generation)

## Steps
1. Read current prompt generation code — understand what's already there
2. Create `lib/agents/prompt-builder.ts` with `buildInboundAgentPrompt(config)` function
3. Write the unified prompt following the skeleton in Knowledge section
4. Wire the function into the Telnyx assistant creation endpoint
5. Run `npx tsc --noEmit`

## On Completion
- **Commit:** `feat: unified inbound agent prompt builder`
- **Handoff notes:** Task 03 adds language specialist + handoff tool. Task 04 adds knowledge base injection into this prompt.
