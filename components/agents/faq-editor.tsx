"use client"

import { useState, useCallback } from "react"
import { Plus, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { FAQEntry } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FAQEditorProps {
  entries: FAQEntry[]
  onChange: (entries: FAQEntry[]) => void
  maxEntries?: number
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FAQEditor({
  entries,
  onChange,
  maxEntries = 20,
}: FAQEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addMode, setAddMode] = useState(false)
  const [draftQuestion, setDraftQuestion] = useState("")
  const [draftAnswer, setDraftAnswer] = useState("")

  const handleAdd = useCallback(() => {
    if (!draftQuestion.trim() || !draftAnswer.trim()) return
    const entry: FAQEntry = {
      id: crypto.randomUUID(),
      question: draftQuestion.trim(),
      answer: draftAnswer.trim(),
    }
    onChange([...entries, entry])
    setDraftQuestion("")
    setDraftAnswer("")
    setAddMode(false)
  }, [entries, draftQuestion, draftAnswer, onChange])

  const handleDelete = useCallback(
    (id: string) => {
      onChange(entries.filter((e) => e.id !== id))
    },
    [entries, onChange],
  )

  const handleSaveEdit = useCallback(
    (id: string, question: string, answer: string) => {
      onChange(
        entries.map((e) =>
          e.id === id ? { ...e, question: question.trim(), answer: answer.trim() } : e,
        ),
      )
      setEditingId(null)
    },
    [entries, onChange],
  )

  const canAdd = entries.length < maxEntries

  return (
    <div className="space-y-3">
      {entries.length === 0 && !addMode && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No FAQ entries yet. Add questions your AI agent can answer.
        </p>
      )}

      {entries.map((entry) =>
        editingId === entry.id ? (
          <FAQEditRow
            key={entry.id}
            entry={entry}
            onSave={handleSaveEdit}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <FAQDisplayRow
            key={entry.id}
            entry={entry}
            onEdit={() => setEditingId(entry.id)}
            onDelete={() => handleDelete(entry.id)}
          />
        ),
      )}

      {addMode ? (
        <div className="space-y-3 rounded-lg border border-dashed border-[#1773cf]/40 bg-[#eff6ff]/30 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Question</Label>
            <Input
              value={draftQuestion}
              onChange={(e) => setDraftQuestion(e.target.value)}
              placeholder="e.g., What types of insurance do you offer?"
              maxLength={500}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Answer</Label>
            <Textarea
              value={draftAnswer}
              onChange={(e) => setDraftAnswer(e.target.value)}
              placeholder="e.g., We specialize in term life insurance..."
              rows={2}
              maxLength={1000}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!draftQuestion.trim() || !draftAnswer.trim()}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAddMode(false)
                setDraftQuestion("")
                setDraftAnswer("")
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed"
            onClick={() => setAddMode(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add FAQ ({entries.length}/{maxEntries})
          </Button>
        )
      )}

      {!canAdd && !addMode && (
        <p className="text-center text-xs text-muted-foreground">
          Maximum {maxEntries} FAQ entries reached.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Display row                                                        */
/* ------------------------------------------------------------------ */

function FAQDisplayRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: FAQEntry
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[#0f172a]">
            Q: {entry.question}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            A: {entry.answer}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit row                                                           */
/* ------------------------------------------------------------------ */

function FAQEditRow({
  entry,
  onSave,
  onCancel,
}: {
  entry: FAQEntry
  onSave: (id: string, question: string, answer: string) => void
  onCancel: () => void
}) {
  const [question, setQuestion] = useState(entry.question)
  const [answer, setAnswer] = useState(entry.answer)

  return (
    <div className="space-y-3 rounded-lg border border-[#1773cf]/40 bg-[#eff6ff]/30 p-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Question</Label>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Answer</Label>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={2}
          maxLength={1000}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onSave(entry.id, question, answer)}
          disabled={!question.trim() || !answer.trim()}
        >
          <Check className="mr-1.5 h-3.5 w-3.5" />
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1.5 h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
