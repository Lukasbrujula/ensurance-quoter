/* ------------------------------------------------------------------ */
/*  Lead Notes Data Access                                             */
/* ------------------------------------------------------------------ */

import { createAuthClient } from "./auth-server"
import type { Tables, TablesInsert } from "@/lib/types/database.generated"
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption/crypto"

type LeadNoteDbRow = Tables<"lead_notes">

export interface LeadNote {
  id: string
  leadId: string
  agentId: string
  content: string
  createdAt: string
}

function decryptContent(value: string): string {
  if (!value || !isEncrypted(value)) return value
  try {
    return decrypt(value)
  } catch {
    return "[encrypted]"
  }
}

function rowToNote(row: LeadNoteDbRow): LeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    agentId: row.agent_id,
    content: decryptContent(row.content),
    createdAt: row.created_at ?? new Date().toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export async function getNotesForLead(leadId: string, agentId: string): Promise<LeadNote[]> {
  const supabase = await createAuthClient()

  const { data: rows, error } = await supabase
    .from("lead_notes")
    .select("*")
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })

  if (error) throw new Error("Failed to load notes")

  return (rows ?? []).map(rowToNote)
}

/* ------------------------------------------------------------------ */
/*  Insert                                                             */
/* ------------------------------------------------------------------ */

export async function addNote(
  leadId: string,
  agentId: string,
  content: string,
): Promise<LeadNote> {
  const supabase = await createAuthClient()

  const insert: TablesInsert<"lead_notes"> = {
    lead_id: leadId,
    agent_id: agentId,
    content: content ? encrypt(content) : content,
  }

  const { data: row, error } = await supabase
    .from("lead_notes")
    .insert(insert)
    .select()
    .single()

  if (error) throw new Error("Failed to add note")

  return rowToNote(row)
}

/* ------------------------------------------------------------------ */
/*  Delete                                                             */
/* ------------------------------------------------------------------ */

export async function deleteNote(noteId: string, agentId: string): Promise<void> {
  const supabase = await createAuthClient()

  const { error } = await supabase
    .from("lead_notes")
    .delete()
    .eq("id", noteId)
    .eq("agent_id", agentId)

  if (error) throw new Error("Failed to delete note")
}
