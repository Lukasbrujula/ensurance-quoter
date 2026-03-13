/* ------------------------------------------------------------------ */
/*  Gmail API Service                                                  */
/*  Send, list, and fetch emails via the Gmail API.                    */
/*  Follows the same pattern as calendar-service.ts.                   */
/* ------------------------------------------------------------------ */

import { google, type gmail_v1 } from "googleapis"
import { getGoogleTokens, updateGoogleTokens } from "@/lib/supabase/google-integrations"
import { getOAuth2Client } from "./oauth"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GmailMessage {
  id: string
  threadId: string
  from: string
  to: string
  cc: string | null
  subject: string
  bodySnippet: string
  bodyHtml: string
  hasAttachments: boolean
  date: string
  labelIds: string[]
}

export interface GmailSendInput {
  to: string
  cc?: string
  subject: string
  body: string
  threadId?: string
}

/* ------------------------------------------------------------------ */
/*  Client factory                                                     */
/* ------------------------------------------------------------------ */

/**
 * Create an authenticated Gmail client for an agent.
 * Returns null if Google is not connected.
 * Automatically refreshes tokens and persists new ones.
 */
async function getGmailClient(
  agentId: string,
): Promise<gmail_v1.Gmail | null> {
  const tokens = await getGoogleTokens(agentId)
  if (!tokens) return null

  const oauth2Client = getOAuth2Client()
  if (!oauth2Client) return null

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  })

  // Auto-persist refreshed tokens
  oauth2Client.on("tokens", (newTokens) => {
    void updateGoogleTokens(agentId, {
      access_token: newTokens.access_token ?? undefined,
      refresh_token: newTokens.refresh_token ?? undefined,
      expiry_date: newTokens.expiry_date ?? undefined,
    }).catch((err: unknown) =>
      console.error("Failed to persist refreshed Gmail tokens:", err),
    )
  })

  return google.gmail({ version: "v1", auth: oauth2Client })
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ""
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): {
  snippet: string
  html: string
} {
  if (!payload) return { snippet: "", html: "" }

  // Simple single-part message
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = Buffer.from(payload.body.data, "base64url").toString("utf8")
    return { snippet: html.replace(/<[^>]*>/g, "").slice(0, 200), html }
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    const text = Buffer.from(payload.body.data, "base64url").toString("utf8")
    return { snippet: text.slice(0, 200), html: `<pre>${text}</pre>` }
  }

  // Multipart — recurse into parts
  if (payload.parts) {
    let htmlResult = ""
    let textResult = ""

    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        htmlResult = Buffer.from(part.body.data, "base64url").toString("utf8")
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        textResult = Buffer.from(part.body.data, "base64url").toString("utf8")
      } else if (part.mimeType?.startsWith("multipart/") && part.parts) {
        const nested = extractBody(part)
        if (nested.html) htmlResult = nested.html
        if (nested.snippet && !textResult) textResult = nested.snippet
      }
    }

    if (htmlResult) {
      return {
        snippet: htmlResult.replace(/<[^>]*>/g, "").slice(0, 200),
        html: htmlResult,
      }
    }
    if (textResult) {
      return { snippet: textResult.slice(0, 200), html: `<pre>${textResult}</pre>` }
    }
  }

  return { snippet: "", html: "" }
}

function hasAttachmentParts(payload: gmail_v1.Schema$MessagePart | undefined): boolean {
  if (!payload) return false
  if (payload.filename && payload.filename.length > 0 && payload.body?.attachmentId) {
    return true
  }
  return payload.parts?.some((p) => hasAttachmentParts(p)) ?? false
}

function parseGmailMessage(msg: gmail_v1.Schema$Message): GmailMessage {
  const headers = msg.payload?.headers
  const { snippet, html } = extractBody(msg.payload)

  return {
    id: msg.id ?? "",
    threadId: msg.threadId ?? "",
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    cc: getHeader(headers, "Cc") || null,
    subject: getHeader(headers, "Subject"),
    bodySnippet: snippet,
    bodyHtml: html,
    hasAttachments: hasAttachmentParts(msg.payload),
    date: getHeader(headers, "Date") || new Date(Number(msg.internalDate ?? 0)).toISOString(),
    labelIds: msg.labelIds ?? [],
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Send an email via the agent's connected Gmail account.
 * Returns the sent message's Gmail ID and thread ID.
 */
export async function sendGmailMessage(
  agentId: string,
  input: GmailSendInput,
): Promise<{ messageId: string; threadId: string } | null> {
  const gmail = await getGmailClient(agentId)
  if (!gmail) return null

  const tokens = await getGoogleTokens(agentId)
  const fromAddress = tokens?.email ?? ""

  // Build RFC 2822 email
  const headers = [
    `From: ${fromAddress}`,
    `To: ${input.to}`,
    ...(input.cc ? [`Cc: ${input.cc}`] : []),
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    ...(input.threadId ? [`References: <${input.threadId}>`] : []),
  ]

  const raw = [...headers, "", input.body].join("\r\n")
  const encoded = Buffer.from(raw).toString("base64url")

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encoded,
      ...(input.threadId ? { threadId: input.threadId } : {}),
    },
  })

  return {
    messageId: res.data.id ?? "",
    threadId: res.data.threadId ?? "",
  }
}

/**
 * List recent messages from the agent's Gmail that match lead email addresses.
 * `emailAddresses` — list of lead emails to filter by.
 * Returns up to `maxResults` messages (default 50).
 */
export async function listGmailMessages(
  agentId: string,
  emailAddresses: string[],
  maxResults = 50,
): Promise<GmailMessage[]> {
  const gmail = await getGmailClient(agentId)
  if (!gmail) return []

  if (emailAddresses.length === 0) return []

  // Build Gmail search query: from OR to any of the lead email addresses
  const emailQueries = emailAddresses.map(
    (e) => `(from:${e} OR to:${e})`,
  )
  const query = emailQueries.join(" OR ")

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  })

  const messageIds = listRes.data.messages ?? []
  if (messageIds.length === 0) return []

  // Fetch full message details in parallel (batch of 20)
  const results: GmailMessage[] = []
  const batchSize = 20

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize)
    const fetched = await Promise.all(
      batch.map(async (m) => {
        try {
          const res = await gmail.users.messages.get({
            userId: "me",
            id: m.id!,
            format: "full",
          })
          return parseGmailMessage(res.data)
        } catch {
          return null
        }
      }),
    )
    results.push(...fetched.filter((m): m is GmailMessage => m !== null))
  }

  return results
}

/**
 * List messages for a specific lead by their email address.
 */
export async function listGmailMessagesForLead(
  agentId: string,
  leadEmail: string,
  maxResults = 30,
): Promise<GmailMessage[]> {
  return listGmailMessages(agentId, [leadEmail], maxResults)
}

/**
 * Get a single Gmail message by ID.
 */
export async function getGmailMessage(
  agentId: string,
  messageId: string,
): Promise<GmailMessage | null> {
  const gmail = await getGmailClient(agentId)
  if (!gmail) return null

  try {
    const res = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    })
    return parseGmailMessage(res.data)
  } catch {
    return null
  }
}

/**
 * Get the agent's Gmail address.
 */
export async function getGmailAddress(agentId: string): Promise<string | null> {
  const tokens = await getGoogleTokens(agentId)
  return tokens?.email ?? null
}
