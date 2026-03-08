# UA-03: Polish — Starter Questions, Sources, Branding

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

---

## 1. Model
Sonnet — UI polish + minor API additions

## 2. Tools
- Antigravity (Claude Code)
- Terminal (`bunx tsc --noEmit`, `bun run build`)

## 3. Guardrails
- ❌ Do NOT change the core AI logic or system prompt from UA-02
- ❌ Do NOT add new data sources — this is polish only
- ❌ Do NOT touch `components/ui/` or `styles/globals.css`
- ✅ DO keep changes cosmetic and UX-focused
- ✅ DO test the full flow end-to-end after changes

## 4. Knowledge

### What This Task Covers
Three polish items to make the assistant conference-demo-ready:

**A. Starter Questions That Actually Work**
The suggested questions from UA-01 were placeholder. Now that the AI is wired up, refine them to showcase the best "wow" moments:

Suggested questions (these should demonstrate the competitive advantage):
1. "I have a client who vapes — which carriers won't charge tobacco rates?" → Shows Foresters advantage
2. "My client has a DUI from 2 years ago. Who will write them?" → Shows UHL DLX uniqueness
3. "Compare rates for a healthy 35-year-old male in Texas, $500K 20-year term" → Shows Compulife pricing
4. "Client has Type 2 Diabetes and high blood pressure — which carriers should I avoid?" → Shows combination decline rules
5. "Which carriers accept bipolar disorder?" → Shows John Hancock's mental health advantage

Each question should be a clickable chip that sends the message immediately (not just populates the input).

**B. Source Indicators**
When the assistant references specific carrier data, show a subtle indicator of where the data came from. Not a full citation system — just a footer or badge like:

"Sources: Carrier guide data (Feb 2026) • Compulife pricing (live)"

Or per-message: if the response used the `get_quote` tool, show a small "📊 Live pricing from Compulife" tag. If it's purely from carrier intelligence data, show "📋 From carrier underwriting guides."

This builds trust — agents want to know the data is real, not AI hallucination.

**C. Branding & Empty State**
When the chat is empty (first load), show:
- Ensurance logo or icon
- "Underwriting Assistant" title
- Subtitle: "Your AI-powered underwriting expert. Ask about carriers, medical conditions, tobacco rules, pricing, or anything else."
- The suggested question chips below
- Maybe a small note: "Powered by data from 84+ carrier guides and real-time Compulife pricing"

### Loading States
- While assistant is thinking: show typing indicator (three dots or pulsing)
- While fetching pricing (tool call): show "Fetching live pricing..." message
- Error state: "Something went wrong. Try again." with retry button

## 5. Memory
- UA-01 created the chat page and UI components at `app/assistant/` and `components/assistant/`
- UA-02 created the API endpoint at `/api/assistant/chat` with streaming and tool calling
- Suggested questions component is at `components/assistant/suggested-questions.tsx`
- The app uses Sonner for toasts
- Existing design uses shadcn/ui badges for status indicators

## 6. Success Criteria
- [ ] Suggested questions are updated to the 5 showcase scenarios
- [ ] Clicking a suggested question sends it immediately (not just populates input)
- [ ] Source indicator appears on assistant messages ("Carrier guides" or "Live pricing")
- [ ] Empty state shows branding, title, subtitle, and question chips
- [ ] Typing indicator shows while assistant is responding
- [ ] "Fetching pricing..." indicator shows during Compulife tool calls
- [ ] Error state with retry works
- [ ] Full demo flow works: open page → click suggested question → get streaming response with source indicator
- [ ] `bunx tsc --noEmit` passes clean
- [ ] `bun run build` passes clean

## 7. Dependencies

**Files to read first:**
```bash
cat components/assistant/chat-interface.tsx       # Main chat UI
cat components/assistant/suggested-questions.tsx   # Question chips
cat components/assistant/chat-message.tsx          # Message rendering
cat app/api/assistant/chat/route.ts               # API endpoint
```

**Files to modify:**
- `components/assistant/suggested-questions.tsx` — update questions, make them send on click
- `components/assistant/chat-message.tsx` — add source indicator
- `components/assistant/chat-interface.tsx` — add empty state branding, loading states, error handling
- `app/api/assistant/chat/route.ts` — add metadata to responses indicating source (tool call vs static data)

**Files to create:**
- `components/assistant/empty-state.tsx` — branded empty state component (optional — could be inline in chat-interface)

## 8. Failure Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Source indicator always shows same type | API not returning source metadata | Add a `sources` field to the streamed response or detect tool usage client-side |
| Suggested questions send but no response | API endpoint URL mismatch | Verify the `useChat` hook points to `/api/assistant/chat` |
| Empty state flickers on reload | Chat messages load async | Show empty state only when messages array is empty AND not loading |
| Typing indicator stuck | Stream didn't close properly | Add a timeout — if no response after 30s, show error state |
| Build fails on new component | Import path wrong | Check exact file paths created in UA-01 |

## 9. Learning
- The source indicators don't need to be complex — even a simple text footer builds agent trust significantly
- For the conference demo, the suggested questions ARE the demo. Pick them to show the strongest differentiation stories.
- If streaming metadata (sources) is hard to add to the Vercel AI SDK stream, a simpler approach: if the response mentions specific premium amounts, assume Compulife was used. If it's purely about rules/policies, assume carrier guides. Client-side heuristic is fine for v1.
- Test with Max's real questions if possible — he'll know what agents actually ask

---

## On Completion
- Commit: `feat: polish underwriting assistant — starter questions, sources, branding`
- Full demo test: open `/assistant`, click each suggested question, verify responses are accurate and well-formatted
- Have Max try it if possible — his feedback is the real validation
- Update CODEBASE_AUDIT.md to document the new `/assistant` page and `/api/assistant/chat` endpoint
