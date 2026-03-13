# UI-04: Inbox — Unread Filter + Email Channel Support

## Model
Claude Opus 4.6

## Objective
Enhance the inbox section with two improvements:
1. Add an "Unread" filter tab alongside the existing "All", "Recent", and "New" tabs
2. Support email as a channel in addition to SMS — if an agent connects their email, they should be able to view and send emails from the inbox

## Tools Required
- File editor
- TypeScript compiler (`bunx tsc --noEmit`)

## What to Do

### Part A: Unread Filter Tab

#### 1. Locate the inbox component
- Route: likely `/inbox` or a component within the dashboard
- Find the existing tab/filter bar that has "All", "Recent", "New"

#### 2. Add "Unread" tab
- Add an "Unread" option to the existing tab group
- Filter logic: show only messages where `read` status is false/null
- If no `read`/`unread` field exists on the message model:
  - Add `is_read: boolean` (default `false`) to the messages/inbox table schema
  - Add a Supabase migration if needed
- Show an unread count badge on the "Unread" tab (e.g., "Unread (3)")

#### 3. Mark as read behavior
- When an agent opens/views a message, mark it as read (update `is_read = true`)
- Provide a "Mark as unread" option (right-click menu or action button)
- Provide "Mark all as read" action in the tab header area

### Part B: Email Channel Support

#### 1. Channel abstraction
- The inbox should support multiple channels: SMS (existing) and Email (new)
- Add a channel filter or toggle: "All" | "SMS" | "Email"
- This can be a secondary filter row below the existing tabs, or integrated as a segmented control

#### 2. Email data model
- If inbox messages are stored in Supabase, add a `channel` column: `'sms' | 'email'`
- Email messages need additional fields: `subject`, `from_email`, `to_email`, `cc`, `html_body`
- Design the schema to be extensible (future channels: voicemail, chat)

#### 3. Email integration approach
- For MVP: build the UI scaffolding with a "Connect Email" placeholder button
- The actual email integration (Gmail API, SMTP, etc.) is a separate task
- Show a state when no email is connected: "Connect your email to send and receive emails from the inbox"
- When connected, emails appear in the unified inbox alongside SMS messages
- Each message row should show a channel icon (phone icon for SMS, mail icon for email)

#### 4. Compose email
- Add a "Compose" button that opens a compose form
- The compose form should detect channel: if replying to SMS → SMS composer, if replying to email → email composer
- Email composer fields: To, CC (optional), Subject, Body (rich text optional, plain text minimum)
- For new messages, let agent choose channel: SMS or Email

## Guardrails
- Do NOT break existing SMS inbox functionality
- Do NOT implement actual email API integration in this task — just the UI and data model
- Do NOT install heavy rich text editors — plain text + basic formatting is fine for MVP
- Keep the inbox performant — don't load all messages at once (paginate or virtual scroll)
- Run `bunx tsc --noEmit` after changes

## Success Criteria
- "Unread" tab exists and correctly filters to unread messages only
- Unread count badge shows on the tab
- Messages marked as read when opened
- Channel icons distinguish SMS vs Email in the message list
- Email compose form exists with To, Subject, Body fields
- "Connect Email" placeholder shown when email not connected
- No TypeScript errors

## Dependencies
- Existing inbox components and Supabase table
- Lucide icons: `Mail`, `MessageSquare`, `Phone`

## Failure Handling
- If inbox doesn't have a Supabase table yet (messages are ephemeral), design the schema first and implement it
- If there's no inbox route/page yet, create it at `/inbox` with the full tab structure
