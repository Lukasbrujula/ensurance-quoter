# UA-01: Standalone Chat Page + UI

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

---

## 1. Model
Sonnet — page layout + chat UI component

## 2. Tools
- Antigravity (Claude Code)
- Terminal (`bunx tsc --noEmit`)

## 3. Guardrails
- ❌ Do NOT modify the existing `/api/chat` endpoint — we'll create a new one in UA-02
- ❌ Do NOT modify `components/quote/ai-assistant-panel.tsx` — build a new component, can borrow patterns
- ❌ Do NOT add any AI/LLM logic in this task — UA-01 is UI only, hardcode a mock response for now
- ❌ Do NOT touch `components/ui/` or `styles/globals.css`
- ✅ DO add `/assistant` to the main navigation (TopNav)
- ✅ DO make this a protected route (Clerk auth required — middleware already handles this since it's not in the public routes list)
- ✅ DO follow existing design patterns — shadcn/ui components, Tailwind, same look and feel as the rest of the app

## 4. Knowledge

### Page Layout
Full-screen chat interface. No sidebar, no panels — just the chat. Clean and focused.

Structure:
```
┌─────────────────────────────────────────┐
│  TopNav (existing — add "Assistant" link)│
├─────────────────────────────────────────┤
│                                         │
│   Ensurance Underwriting Assistant       │
│   "Ask anything about carriers,          │
│    underwriting, or pricing"             │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Chat messages area             │   │
│   │  (scrollable, grows upward)     │   │
│   │                                 │   │
│   │  User: Which carriers accept    │   │
│   │  bipolar disorder?              │   │
│   │                                 │   │
│   │  Assistant: Based on our        │   │
│   │  carrier data, John Hancock...  │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Input: "Ask about carriers..." │ ➤ │
│   └─────────────────────────────────┘   │
│                                         │
│   Suggested: "Tobacco rules for vapers" │
│   "DUI-friendly carriers" "Best rates   │
│    for healthy 30M"                     │
└─────────────────────────────────────────┘
```

### Chat Message Component
Each message has:
- Role indicator (User vs Assistant)
- Timestamp
- Content (markdown rendered for assistant messages)
- Assistant messages should support basic formatting: bold, lists, tables

### Input Area
- Text input with send button
- Enter to send, Shift+Enter for newline
- Disabled while assistant is responding
- Placeholder: "Ask about carriers, underwriting rules, or pricing..."

### Suggested Questions (shown when chat is empty)
Clickable chips that populate the input:
- "Which carriers accept vapers as non-smokers?"
- "Best carriers for a client with DUI history?"
- "Compare term life rates for a healthy 30M, $500K 20yr"
- "What medical conditions does John Hancock accept?"
- "Which carriers operate in all 50 states?"

For now these just populate the input field. In UA-02 they'll actually trigger the AI.

## 5. Memory
- Existing chat UI patterns are in `components/quote/ai-assistant-panel.tsx` — uses Vercel AI SDK's `useChat` hook for streaming. Study this for patterns but build fresh.
- Navigation is in `components/navigation/` — add "Assistant" link there
- The app uses `react-markdown` or similar for rendering AI responses (check existing chat component)
- Auth is handled by Clerk middleware — any route not in the `isPublicRoute` list is automatically protected

## 6. Success Criteria
- [ ] `/assistant` page renders with full-screen chat layout
- [ ] Page is accessible from main navigation (TopNav has "Assistant" link)
- [ ] Chat input works: type message, press Enter or click Send, message appears in chat
- [ ] Mock assistant response appears after sending a message (hardcoded: "I'm the Ensurance Underwriting Assistant. AI integration coming soon!")
- [ ] Suggested question chips display when chat is empty
- [ ] Clicking a suggested question populates the input
- [ ] Messages scroll correctly when chat gets long
- [ ] Responsive: works on mobile and desktop
- [ ] Route is protected (unauthenticated users get redirected to login)
- [ ] `bunx tsc --noEmit` passes clean

## 7. Dependencies

**Files to read first:**
```bash
cat components/quote/ai-assistant-panel.tsx   # Chat UI patterns
cat app/api/chat/route.ts                     # Streaming API pattern
find components/navigation -name "*.tsx"       # Nav structure
cat middleware.ts                              # Route protection
```

**Files to create:**
- `app/assistant/page.tsx` — page component (server component wrapper)
- `components/assistant/chat-interface.tsx` — main chat UI (client component)
- `components/assistant/chat-message.tsx` — individual message bubble
- `components/assistant/suggested-questions.tsx` — starter question chips

**Files to modify:**
- Navigation component — add "Assistant" link

## 8. Failure Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Page 404s | Route not created properly | Verify `app/assistant/page.tsx` exists with default export |
| Nav link doesn't appear | Wrong navigation component modified | Check which nav component is actually rendered — might be `top-nav.tsx` or `sidebar.tsx` |
| Chat doesn't scroll | Missing overflow/scroll CSS | Use `overflow-y-auto` on the messages container, `flex-col-reverse` if needed |
| Suggested questions don't populate input | State management issue | Use a callback from SuggestedQuestions to parent that sets input state |
| Mobile layout broken | Fixed heights or missing responsive classes | Use `h-[calc(100vh-4rem)]` or similar for full-height, test at 375px width |

## 9. Learning
- This is a UI-only task. The mock response lets us verify the full chat flow before adding AI complexity.
- The chat interface will be reused by UA-02 — keep the component API clean (onSend callback, messages array, isLoading state)
- If the existing AI panel uses `useChat` from Vercel AI SDK, note the exact import path and hook API for UA-02
- Document which markdown rendering library is used (react-markdown, marked, etc.)

---

## On Completion
- Commit: `feat: standalone underwriting assistant chat page`
- Verify the page loads at `/assistant` and chat input works with mock responses
- Proceed to UA-02
