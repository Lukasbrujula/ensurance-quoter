# Task: KNOWLEDGE-BASE-UI

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
- [ ] Do NOT build RAG or vector search — knowledge base is injected as plain text into the prompt
- [ ] Do NOT allow knowledge base content to exceed 2000 characters in the prompt injection (truncate with warning if over)
- [ ] Do NOT scrape websites server-side synchronously during agent save — use a background fetch or client-side preview
- [ ] Do NOT modify quote engine, leads, or calling components

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md
- [x] CODEBASE_AUDIT.md — agent settings page location, Supabase agent_settings or equivalent table
- [ ] Read `lib/agents/prompt-builder.ts` (created in Task 02) — find where to inject knowledge base
- [ ] Read current agent create/edit form to understand existing fields

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Agent create/edit form has a "Knowledge Base" section with: a large textarea for FAQ/custom instructions, and a URL field labeled "Website URL (optional — we'll pull your content)"
- [ ] On save, knowledge base text is stored in the database alongside the agent record
- [ ] `buildInboundAgentPrompt()` injects the knowledge base string into the prompt under a "Business Knowledge" section
- [ ] URL field has a "Preview" button that fetches the URL client-side and populates the textarea with extracted text (best effort — no crash if fetch fails)
- [ ] `npx tsc --noEmit` passes clean

### 7. Dependencies
- [ ] Task 02 (UNIFIED-PROMPT-TEMPLATE) complete — knowledge base is injected into that prompt

### 8. Failure Handling
**Max attempts:** 3

**On failure:**
- Attempt 1: Retry
- Attempt 2: Skip URL scraping entirely — textarea only, no URL field
- Attempt 3: Save error to `ERRORS/task-04.md` and STOP

**Rollback:** `git stash && git checkout HEAD~1`

---

## Description
Adds a knowledge base section to the agent setup form. Agents can paste FAQs, business hours, pricing info, or any custom instructions into a textarea. Optionally, they can enter their website URL and click "Preview" to auto-populate the textarea with scraped text. The knowledge base content is injected into the system prompt so the AI can answer questions about the business without hallucinating. This is intentionally simple — no RAG, no vector DB, just plain text injection.

## Acceptance Criteria
- [ ] Knowledge base textarea in agent form (min 6 rows)
- [ ] Optional website URL field with "Preview" button
- [ ] Knowledge base stored in DB (add column to agent table via migration)
- [ ] Content injected into prompt via `buildInboundAgentPrompt()`
- [ ] Character count shown — warning if approaching prompt limit
- [ ] No TypeScript errors

## Steps
1. Add `knowledge_base` text column to agent table via Supabase migration
2. Add Knowledge Base section to agent create/edit form (textarea + URL field + Preview button)
3. Wire Preview button: client-side fetch URL → extract text → populate textarea
4. On save: persist knowledge_base to DB
5. In `buildInboundAgentPrompt()`: inject knowledge_base under "Business Knowledge" section, truncate at 2000 chars
6. `npx tsc --noEmit`

## On Completion
- **Commit:** `feat: knowledge base textarea and prompt injection`
- **Human Checkpoint:** ✅ REQUIRED — Supabase migration review
- **Handoff notes:** Task 05 (hangup tool) is independent. Task 06 (lead auto-creation) completes the agent intake loop.
