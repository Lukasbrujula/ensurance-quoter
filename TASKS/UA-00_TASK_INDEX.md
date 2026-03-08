# Underwriting Assistant Chatbot — Task Index

**Created:** 2026-03-07
**Total Tasks:** 3
**Estimated Total:** ~3 hrs
**Branch:** `feature/lukas`
**Depends on:** Carrier intelligence data in codebase, OpenAI API key configured, Compulife proxy live

---

## What We're Building

A standalone `/assistant` page — a full-screen AI chatbot that answers underwriting questions using our carrier intelligence database and Compulife pricing data. It's a knowledge tool for insurance agents, not a lead tool. Agents ask natural language questions about carriers, medical conditions, tobacco rules, pricing, state availability, DUI policies, etc. and get expert-level answers backed by real data.

**Conference demo pitch:** "Ask any underwriting question and get an instant answer — no more flipping through PDFs or calling your BGA."

---

## Execution Order

Sequential — each builds on the previous:

| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **UA-01** | Standalone chat page + UI | 45 min | None |
| **UA-02** | System prompt + Compulife tool integration | 90 min | UA-01 |
| **UA-03** | Polish: starter questions, sources, branding | 30 min | UA-02 |

---

## Dependency Graph

```
UA-01 (chat page + UI)
  └── UA-02 (system prompt + Compulife tool)
        └── UA-03 (polish + starter questions)
```

---

## Key Design Decisions

- **Standalone page at `/assistant`** — not embedded in the quote workspace. Clean, focused, no confusion with call coaching mode.
- **Knowledge tool, not lead tool** — agents ask general underwriting questions, not client-specific queries (that's what the quoter is for)
- **Compulife for pricing, our data for intelligence** — Compulife is source of truth for rates. Our scraped carrier data covers what Compulife doesn't: tobacco differentiation, medical conditions, prescription screening, DUI rules, living benefits.
- **GPT-4o-mini** — already integrated, fast, cheap. Good enough for this use case.
- **Streaming responses** — matches the existing `/api/chat` pattern

---

## Claude Code Setup Prompt

```
Read these files in order:
1. TASKS/UA-00_TASK_INDEX.md (this file)
2. TASKS/UA-01_CHAT_PAGE.md (first task)
3. app/api/chat/route.ts (existing chat endpoint — reference for streaming pattern)
4. components/quote/ai-assistant-panel.tsx (existing AI panel — reference for chat UI patterns)
5. lib/data/carriers.ts or lib/data/carriers-generated.ts (carrier intelligence data structure)

Then execute UA-01_CHAT_PAGE.md. Run bunx tsc --noEmit after completion.
```
