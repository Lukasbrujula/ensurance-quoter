"use server"

import { z } from "zod"
import {
  getNotesForLead as dbGetNotes,
  addNote as dbAddNote,
  deleteNote as dbDeleteNote,
} from "@/lib/supabase/notes"
import type { LeadNote } from "@/lib/supabase/notes"
import { requireClerkUser as requireUser } from "@/lib/supabase/clerk-client"

/* ------------------------------------------------------------------ */
/*  Server Actions — Lead Notes                                        */
/* ------------------------------------------------------------------ */

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

const uuidSchema = z.string().uuid()
const contentSchema = z.string().min(1).max(5000)

export async function fetchNotes(leadId: string): Promise<ActionResult<LeadNote[]>> {
  try {
    uuidSchema.parse(leadId)
    const user = await requireUser()
    const notes = await dbGetNotes(leadId, user.id)
    return { success: true, data: notes }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load notes" }
  }
}

export async function createNote(
  leadId: string,
  content: string,
): Promise<ActionResult<LeadNote>> {
  try {
    uuidSchema.parse(leadId)
    contentSchema.parse(content)
    const user = await requireUser()
    const note = await dbAddNote(leadId, user.id, content)
    return { success: true, data: note }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add note" }
  }
}

export async function removeNote(noteId: string): Promise<ActionResult<void>> {
  try {
    uuidSchema.parse(noteId)
    const user = await requireUser()
    await dbDeleteNote(noteId, user.id)
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete note" }
  }
}
