"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type {
  CustomFieldDefinition,
  CustomFieldType,
} from "@/lib/types/custom-fields"
import {
  FIELD_TYPE_LABELS,
  MAX_CUSTOM_FIELDS,
} from "@/lib/types/custom-fields"
import { useAuth } from "@clerk/nextjs"
import { useFeatureGate } from "@/lib/billing/use-feature-gate"
import { UpgradePrompt } from "@/lib/billing/feature-gate"

/* ------------------------------------------------------------------ */
/*  Custom Fields Settings                                              */
/* ------------------------------------------------------------------ */

export function CustomFieldsSettingsClient() {
  const { orgId, orgRole } = useAuth()
  const isOrgAdmin = !orgId || orgRole === "org:admin"
  const canUseCustomFields = useFeatureGate("custom_lead_fields")
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CustomFieldDefinition | null>(null)

  const loadFields = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/custom-fields")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setFields(data.definitions ?? [])
    } catch {
      toast.error("Failed to load custom fields")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFields()
  }, [loadFields])

  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index === 0) return
      const reordered = [...fields]
      const tmp = reordered[index - 1]
      reordered[index - 1] = reordered[index]
      reordered[index] = tmp
      setFields(reordered)

      try {
        await fetch("/api/settings/custom-fields", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: reordered.map((f) => f.id) }),
        })
      } catch {
        toast.error("Failed to reorder")
        void loadFields()
      }
    },
    [fields, loadFields],
  )

  const handleMoveDown = useCallback(
    async (index: number) => {
      if (index === fields.length - 1) return
      const reordered = [...fields]
      const tmp = reordered[index + 1]
      reordered[index + 1] = reordered[index]
      reordered[index] = tmp
      setFields(reordered)

      try {
        await fetch("/api/settings/custom-fields", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: reordered.map((f) => f.id) }),
        })
      } catch {
        toast.error("Failed to reorder")
        void loadFields()
      }
    },
    [fields, loadFields],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch("/api/settings/custom-fields", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      })
      if (!res.ok) throw new Error("Failed to delete")
      setFields((prev) => prev.filter((f) => f.id !== deleteTarget.id))
      toast.success("Field deleted")
    } catch {
      toast.error("Failed to delete field")
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const handleSaved = useCallback(
    (field: CustomFieldDefinition, isNew: boolean) => {
      if (isNew) {
        setFields((prev) => [...prev, field])
      } else {
        setFields((prev) =>
          prev.map((f) => (f.id === field.id ? field : f)),
        )
      }
      setDialogOpen(false)
      setEditingField(null)
    },
    [],
  )

  if (!canUseCustomFields) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Custom Fields</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add custom data fields to your leads. These fields appear on every lead detail panel.
          </p>
        </div>
        <UpgradePrompt feature="custom_lead_fields" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Custom Fields</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add custom data fields to your leads. These fields appear on every lead detail panel.
        </p>
      </div>

      {/* Admin notice for non-admin org members */}
      {!isOrgAdmin && (
        <div className="rounded-md border border-border bg-muted/50 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Custom field management is handled by your team admin.
          </p>
        </div>
      )}

      {/* Add button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {fields.length} / {MAX_CUSTOM_FIELDS} fields
        </span>
        {isOrgAdmin && (
        <Button
          size="sm"
          className="gap-1.5"
          disabled={fields.length >= MAX_CUSTOM_FIELDS}
          onClick={() => {
            setEditingField(null)
            setDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
        )}
      </div>

      {/* Field list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No custom fields yet. Click &quot;Add Field&quot; to create one.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{field.fieldName}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {FIELD_TYPE_LABELS[field.fieldType]}
                  </Badge>
                  {field.isRequired && (
                    <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">
                      Required
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Key: {field.fieldKey}
                  {field.fieldType === "select" && field.options
                    ? ` · Options: ${field.options.join(", ")}`
                    : ""}
                </span>
              </div>

              {isOrgAdmin && (
              <>
              {/* Reorder arrows */}
              <div className="flex gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => void handleMoveUp(index)}
                  className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === fields.length - 1}
                  onClick={() => void handleMoveDown(index)}
                  className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted disabled:cursor-default disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Edit / Delete */}
              <button
                type="button"
                onClick={() => {
                  setEditingField(field)
                  setDialogOpen(true)
                }}
                className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Edit field"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(field)}
                className="cursor-pointer rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete field"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <FieldFormDialog
        open={dialogOpen}
        editingField={editingField}
        onClose={() => {
          setDialogOpen(false)
          setEditingField(null)
        }}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the field &quot;{deleteTarget?.fieldName}&quot; and remove
              all its data from every lead. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Field Form Dialog                                                   */
/* ------------------------------------------------------------------ */

interface FieldFormDialogProps {
  open: boolean
  editingField: CustomFieldDefinition | null
  onClose: () => void
  onSaved: (field: CustomFieldDefinition, isNew: boolean) => void
}

function FieldFormDialog({
  open,
  editingField,
  onClose,
  onSaved,
}: FieldFormDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<CustomFieldType>("text")
  const [optionsText, setOptionsText] = useState("")
  const [isRequired, setIsRequired] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Populate form when editing
  useEffect(() => {
    if (editingField) {
      setName(editingField.fieldName)
      setType(editingField.fieldType)
      setOptionsText(editingField.options?.join(", ") ?? "")
      setIsRequired(editingField.isRequired)
    } else {
      setName("")
      setType("text")
      setOptionsText("")
      setIsRequired(false)
    }
    setError("")
  }, [editingField, open])

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Field name is required")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      if (editingField) {
        // Update
        const options =
          type === "select"
            ? optionsText
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean)
            : null

        const res = await fetch("/api/settings/custom-fields", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingField.id,
            fieldName: trimmedName,
            fieldType: type,
            options,
            isRequired,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Failed to update")
        }

        onSaved(
          {
            ...editingField,
            fieldName: trimmedName,
            fieldType: type,
            options: options,
            isRequired,
          },
          false,
        )
        toast.success("Field updated")
      } else {
        // Create
        const options =
          type === "select"
            ? optionsText
                .split(",")
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined

        const res = await fetch("/api/settings/custom-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldName: trimmedName,
            fieldType: type,
            options,
            isRequired,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Failed to create")
        }

        const data = await res.json()
        onSaved(data.definition, true)
        toast.success("Field created")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save"
      setError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingField ? "Edit Field" : "Add Custom Field"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="field-name">Field Name</Label>
            <Input
              id="field-name"
              placeholder="e.g., Employer, Referral Source"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CustomFieldType)}
              disabled={isSaving}
            >
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(FIELD_TYPE_LABELS) as [CustomFieldType, string][]
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === "select" && (
            <div className="space-y-1.5">
              <Label htmlFor="field-options">
                Options <span className="text-muted-foreground">(comma-separated)</span>
              </Label>
              <Input
                id="field-options"
                placeholder="Hot, Warm, Cold"
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                disabled={isSaving}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch
              id="field-required"
              checked={isRequired}
              onCheckedChange={setIsRequired}
              disabled={isSaving}
            />
            <Label htmlFor="field-required" className="cursor-pointer">
              Required field
            </Label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editingField ? "Save Changes" : "Add Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
