/* ------------------------------------------------------------------ */
/*  Google Calendar Service                                            */
/*  CRUD operations on calendar events. Server-side only.              */
/*  Every function is safe to call even if Google is not connected —   */
/*  returns null/false/[] gracefully.                                   */
/* ------------------------------------------------------------------ */

import { google } from "googleapis"
import { createAuthenticatedClient } from "./oauth"
import {
  getGoogleTokens,
  updateGoogleTokens,
} from "@/lib/supabase/google-integrations"
import type { DbClient } from "@/lib/supabase/server"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CalendarEventInput {
  title: string
  description?: string
  startTime: string // ISO 8601
  endTime?: string // ISO 8601 — defaults to startTime + 30 min
  allDay?: boolean // If true, startTime is treated as YYYY-MM-DD date
  leadId?: string
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string | null
  startTime: string
  endTime: string
  leadId?: string | null
}

/* ------------------------------------------------------------------ */
/*  Internal: get authenticated calendar client                        */
/* ------------------------------------------------------------------ */

async function getCalendarClient(agentId: string, dbClient?: DbClient) {
  const tokens = await getGoogleTokens(agentId, dbClient)
  if (!tokens) return null

  const oauth2Client = createAuthenticatedClient({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  })
  if (!oauth2Client) return null

  // Listen for token refresh events — persist new tokens
  oauth2Client.on("tokens", (newTokens) => {
    updateGoogleTokens(agentId, {
      access_token: newTokens.access_token ?? undefined,
      refresh_token: newTokens.refresh_token ?? undefined,
      expiry_date: newTokens.expiry_date ?? undefined,
    }, dbClient).catch((err) => {
      console.error("[Google Calendar] Failed to persist refreshed tokens:", err)
    })
  })

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    calendarId: tokens.calendarId,
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Create a calendar event. Returns the Google event ID or null.
 */
export async function createCalendarEvent(
  agentId: string,
  event: CalendarEventInput,
  dbClient?: DbClient,
): Promise<string | null> {
  try {
    const client = await getCalendarClient(agentId, dbClient)
    if (!client) return null

    const startEnd = event.allDay
      ? {
          start: { date: event.startTime.slice(0, 10) },
          end: { date: event.startTime.slice(0, 10) },
        }
      : (() => {
          const startTime = new Date(event.startTime)
          const endTime = event.endTime
            ? new Date(event.endTime)
            : new Date(startTime.getTime() + 30 * 60 * 1000)
          return {
            start: { dateTime: startTime.toISOString() },
            end: { dateTime: endTime.toISOString() },
          }
        })()

    const res = await client.calendar.events.insert({
      calendarId: client.calendarId,
      requestBody: {
        summary: event.title,
        description: event.description,
        ...startEnd,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 15 },
            { method: "popup", minutes: 5 },
          ],
        },
        extendedProperties: {
          private: {
            source: "ensurance",
            ...(event.leadId ? { ensurance_lead_id: event.leadId } : {}),
          },
        },
      },
    })

    return res.data.id ?? null
  } catch (error) {
    console.error("[Google Calendar] Failed to create event:", error instanceof Error ? error.message : String(error))
    return null
  }
}

/**
 * Update an existing calendar event. Returns true on success.
 */
export async function updateCalendarEvent(
  agentId: string,
  googleEventId: string,
  updates: Partial<CalendarEventInput>,
  dbClient?: DbClient,
): Promise<boolean> {
  try {
    const client = await getCalendarClient(agentId, dbClient)
    if (!client) return false

    const requestBody: Record<string, unknown> = {}
    if (updates.title) requestBody.summary = updates.title
    if (updates.description !== undefined) requestBody.description = updates.description
    if (updates.startTime) {
      const startTime = new Date(updates.startTime)
      const endTime = updates.endTime
        ? new Date(updates.endTime)
        : new Date(startTime.getTime() + 30 * 60 * 1000)
      requestBody.start = { dateTime: startTime.toISOString() }
      requestBody.end = { dateTime: endTime.toISOString() }
    }

    await client.calendar.events.patch({
      calendarId: client.calendarId,
      eventId: googleEventId,
      requestBody,
    })

    return true
  } catch (error) {
    console.error("[Google Calendar] Failed to update event:", error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Delete a calendar event. Returns true on success.
 */
export async function deleteCalendarEvent(
  agentId: string,
  googleEventId: string,
  dbClient?: DbClient,
): Promise<boolean> {
  try {
    const client = await getCalendarClient(agentId, dbClient)
    if (!client) return false

    await client.calendar.events.delete({
      calendarId: client.calendarId,
      eventId: googleEventId,
    })

    return true
  } catch (error) {
    console.error("[Google Calendar] Failed to delete event:", error instanceof Error ? error.message : String(error))
    return false
  }
}

/**
 * Get upcoming events from Google Calendar.
 * Returns events with Ensurance metadata + external events.
 */
export async function getUpcomingEvents(
  agentId: string,
  startDate: Date,
  endDate: Date,
  dbClient?: DbClient,
): Promise<CalendarEvent[]> {
  try {
    const client = await getCalendarClient(agentId, dbClient)
    if (!client) return []

    const res = await client.calendar.events.list({
      calendarId: client.calendarId,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    })

    return (res.data.items ?? []).map((item) => ({
      id: item.id ?? "",
      summary: item.summary ?? "Untitled event",
      description: item.description ?? null,
      startTime: item.start?.dateTime ?? item.start?.date ?? "",
      endTime: item.end?.dateTime ?? item.end?.date ?? "",
      leadId: item.extendedProperties?.private?.ensurance_lead_id ?? null,
    }))
  } catch (error) {
    console.error("[Google Calendar] Failed to list events:", error instanceof Error ? error.message : String(error))
    return []
  }
}

/**
 * Check if Google Calendar is connected for an agent.
 */
export async function isCalendarConnected(
  agentId: string,
  dbClient?: DbClient,
): Promise<boolean> {
  const tokens = await getGoogleTokens(agentId, dbClient)
  return tokens !== null
}
