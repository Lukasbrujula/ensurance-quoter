"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { format } from "date-fns"
import { Loader2, StickyNote, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/empty-state"
import { fetchNotes, createNote, removeNote } from "@/lib/actions/notes"
import type { LeadNote } from "@/lib/supabase/notes"

interface LeadNotesProps {
  leadId: string
}

export function LeadNotes({ leadId }: LeadNotesProps) {
  const [notes, setNotes] = useState<LeadNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadNotes = useCallback(async () => {
    setIsLoading(true)
    const result = await fetchNotes(leadId)
    if (result.success && result.data) {
      setNotes(result.data)
    }
    setIsLoading(false)
  }, [leadId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const handleAdd = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed) return

    setIsAdding(true)
    const result = await createNote(leadId, trimmed)
    if (result.success && result.data) {
      setNotes((prev) => [result.data!, ...prev])
      setContent("")
      toast.success("Note added")
    } else {
      toast.error(result.error ?? "Failed to add note")
    }
    setIsAdding(false)
  }, [leadId, content])

  const handleDelete = useCallback(async (noteId: string) => {
    setDeletingId(noteId)
    const result = await removeNote(noteId)
    if (result.success) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast.success("Note deleted")
    } else {
      toast.error(result.error ?? "Failed to delete note")
    }
    setDeletingId(null)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleAdd()
      }
    },
    [handleAdd],
  )

  return (
    <div className="border-t border-border bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 lg:px-6">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[13px] font-semibold">
          Notes{!isLoading && ` (${notes.length})`}
        </h3>
      </div>

      {/* Notes list */}
      <div className="px-4 lg:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={<StickyNote className="text-muted-foreground" />}
            title="No notes yet"
            description="Add a note to remember important details about this client."
            compact
          />
        ) : (
          <div className="max-h-[300px] space-y-1 overflow-y-auto pb-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(note.createdAt), "MMM d, h:mm a")}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed">
                      {note.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete note"
                  >
                    {deletingId === note.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-2 border-t border-border pt-3 pb-4">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a note..."
            className="min-h-[40px] resize-none text-[13px]"
            rows={1}
            maxLength={5000}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isAdding || !content.trim()}
            className="shrink-0"
          >
            {isAdding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
