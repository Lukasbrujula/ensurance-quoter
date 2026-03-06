"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Bell,
  Calendar,
  ClipboardList,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import type {
  AiAgentRow,
  CollectFieldId,
  CustomCollectField,
  PostCallActionId,
} from "@/lib/types/database"
import { EditStepNav } from "./edit-step-nav"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CUSTOM_FIELDS_MAX = 10

interface StandardFieldDef {
  id: CollectFieldId
  label: string
  description: string
  locked: boolean
}

const STANDARD_FIELDS: StandardFieldDef[] = [
  {
    id: "name",
    label: "Caller's Name",
    description: "Full name of the caller",
    locked: true,
  },
  {
    id: "phone",
    label: "Callback Phone Number",
    description: "Best number to call them back on",
    locked: true,
  },
  {
    id: "reason",
    label: "Reason for Calling",
    description: "Why they are calling, in a brief summary",
    locked: true,
  },
  {
    id: "callback_time",
    label: "Preferred Callback Time",
    description: "When they prefer to be called back",
    locked: false,
  },
  {
    id: "email",
    label: "Email Address",
    description: "Their email, spelled back to confirm",
    locked: false,
  },
  {
    id: "date_of_birth",
    label: "Date of Birth",
    description: "Date of birth or approximate age",
    locked: false,
  },
  {
    id: "state",
    label: "State of Residence",
    description: "Which state they live in",
    locked: false,
  },
]


interface PostCallActionDef {
  id: PostCallActionId
  label: string
  description: string
  icon: typeof ClipboardList
}

const POST_CALL_ACTIONS: PostCallActionDef[] = [
  {
    id: "save_lead",
    label: "Save as Lead",
    description: "Automatically create a lead from caller info",
    icon: ClipboardList,
  },
  {
    id: "send_notification",
    label: "Send Notification",
    description: "Get notified when a call completes",
    icon: Bell,
  },
  {
    id: "book_calendar",
    label: "Book Calendar",
    description: "Schedule callback on Google Calendar",
    icon: Calendar,
  },
]

/* ------------------------------------------------------------------ */
/*  Form state                                                         */
/* ------------------------------------------------------------------ */

interface CollectFieldsFormState {
  collectFields: CollectFieldId[]
  customCollectFields: CustomCollectField[]
  postCallActions: PostCallActionId[]
}

const INITIAL_STATE: CollectFieldsFormState = {
  collectFields: ["name", "phone", "reason", "callback_time"],
  customCollectFields: [],
  postCallActions: ["save_lead", "book_calendar", "send_notification"],
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function CollectFieldsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-96" />
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgentCollectFieldsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")

  const [form, setForm] = useState<CollectFieldsFormState>(INITIAL_STATE)
  const [original, setOriginal] = useState<CollectFieldsFormState>(INITIAL_STATE)
  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<number, string>>({})

  const isEditMode = Boolean(editId)

  // Load existing agent when editing
  useEffect(() => {
    if (!editId) return

    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agents/${editId}`)
        if (!res.ok) throw new Error("Failed to load agent")
        const json = await res.json()
        const agent: AiAgentRow = json.agent

        const loaded: CollectFieldsFormState = {
          collectFields: agent.collect_fields ?? INITIAL_STATE.collectFields,
          customCollectFields: agent.custom_collect_fields ?? [],
          postCallActions: agent.post_call_actions ?? INITIAL_STATE.postCallActions,
        }
        setForm(loaded)
        setOriginal(loaded)
      } catch (error) {
        toast.error("Failed to load agent details")
        console.error(
          "fetchAgent error:",
          error instanceof Error ? error.message : String(error),
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [editId])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(original),
    [form, original],
  )

  // Standard field toggle
  const toggleStandardField = useCallback((fieldId: CollectFieldId, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      collectFields: checked
        ? [...prev.collectFields, fieldId]
        : prev.collectFields.filter((f) => f !== fieldId),
    }))
  }, [])

  // Post-call action toggle
  const togglePostCallAction = useCallback((actionId: PostCallActionId, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      postCallActions: checked
        ? [...prev.postCallActions, actionId]
        : prev.postCallActions.filter((a) => a !== actionId),
    }))
  }, [])

  // Custom field handlers
  const addCustomField = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      customCollectFields: [
        ...prev.customCollectFields,
        { name: "", description: "", required: false },
      ],
    }))
  }, [])

  const removeCustomField = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      customCollectFields: prev.customCollectFields.filter((_, i) => i !== index),
    }))
    setCustomFieldErrors((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }, [])

  const updateCustomField = useCallback(
    (index: number, updates: Partial<CustomCollectField>) => {
      setForm((prev) => ({
        ...prev,
        customCollectFields: prev.customCollectFields.map((f, i) =>
          i === index ? { ...f, ...updates } : f,
        ),
      }))
      if (updates.name !== undefined) {
        setCustomFieldErrors((prev) => {
          if (!prev[index]) return prev
          const next = { ...prev }
          delete next[index]
          return next
        })
      }
    },
    [],
  )

  // Validation
  const validate = useCallback((): boolean => {
    const errors: Record<number, string> = {}
    for (let i = 0; i < form.customCollectFields.length; i++) {
      if (!form.customCollectFields[i].name.trim()) {
        errors[i] = "Field name is required"
      }
    }
    setCustomFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [form.customCollectFields])

  // Save
  const handleSave = useCallback(async () => {
    if (!editId) return
    if (!validate()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collect_fields: form.collectFields,
          custom_collect_fields: form.customCollectFields.map((f) => ({
            name: f.name.trim(),
            description: f.description.trim(),
            required: f.required ?? false,
          })),
          post_call_actions: form.postCallActions,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error ?? "Failed to update agent")
      }

      toast.success("Collection settings saved")
      setOriginal(form)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [form, editId, validate])

  if (loading) return <CollectFieldsSkeleton />

  const atCustomLimit = form.customCollectFields.length >= CUSTOM_FIELDS_MAX

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 gap-1.5 text-muted-foreground"
            onClick={() =>
              editId ? router.push(`/agents/${editId}`) : router.push("/agents")
            }
          >
            <ArrowLeft className="h-4 w-4" />
            {editId ? "Back to Agent" : "Back to Agents"}
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Collection Fields
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose what information your AI agent collects from callers and what
            happens after each call.
          </p>
        </div>

        <div className="space-y-6">
          {/* Standard Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Standard Fields</CardTitle>
              </div>
              <CardDescription>
                Fields the AI will ask callers for. Required fields are always
                collected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {STANDARD_FIELDS.map((field) => {
                  const isLocked = field.locked
                  const isEnabled =
                    isLocked || form.collectFields.includes(field.id)

                  return (
                    <div
                      key={field.id}
                      className="flex items-start gap-3 rounded-md border px-3 py-2.5"
                    >
                      <Checkbox
                        checked={isEnabled}
                        disabled={isLocked}
                        onCheckedChange={(checked) =>
                          toggleStandardField(field.id, Boolean(checked))
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {field.label}
                          </span>
                          {isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Lock className="h-2.5 w-2.5" />
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {field.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Custom Fields</CardTitle>
              </div>
              <CardDescription>
                Add your own fields. The AI will ask callers for this
                information and extract it from the transcript.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.customCollectFields.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  No custom fields yet. Add one below.
                </p>
              )}

              {form.customCollectFields.map((field, index) => (
                <div
                  key={index}
                  className="rounded-md border p-3 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={field.name}
                        onChange={(e) =>
                          updateCustomField(index, { name: e.target.value })
                        }
                        placeholder="Field name (e.g., Policy Number)"
                        maxLength={100}
                        className={
                          customFieldErrors[index] ? "border-destructive" : ""
                        }
                      />
                      {customFieldErrors[index] && (
                        <p className="text-xs text-destructive">
                          {customFieldErrors[index]}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomField(index)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={field.description}
                    onChange={(e) =>
                      updateCustomField(index, {
                        description: e.target.value,
                      })
                    }
                    placeholder='e.g., Ask: "Do you have a current policy number?"'
                    maxLength={500}
                    className="text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.required ?? false}
                      onCheckedChange={(checked) =>
                        updateCustomField(index, { required: checked })
                      }
                      aria-label={`${field.name || "Field"} required`}
                    />
                    <Label className="text-xs text-muted-foreground">
                      {field.required ? "Required" : "Optional"}
                    </Label>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addCustomField}
                disabled={atCustomLimit}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Field
              </Button>
              {atCustomLimit && (
                <p className="text-xs text-muted-foreground">
                  Maximum of {CUSTOM_FIELDS_MAX} custom fields reached.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Post-Call Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Post-Call Actions</CardTitle>
              </div>
              <CardDescription>
                What happens automatically after each call ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {POST_CALL_ACTIONS.map((action) => {
                  const isChecked = form.postCallActions.includes(action.id)
                  const ActionIcon = action.icon

                  return (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 rounded-md border px-3 py-2.5"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          togglePostCallAction(action.id, Boolean(checked))
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ActionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {action.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                        {action.id === "book_calendar" && isChecked && (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                            Requires Google Calendar to be connected in Settings
                            &rarr; Integrations.
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Separator />
          <div className="flex items-center justify-between pb-4">
            <Button
              variant="outline"
              onClick={() =>
                editId
                  ? router.push(`/agents/${editId}`)
                  : router.push("/agents")
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty || !isEditMode}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Step navigation */}
          {editId && (
            <div className="pb-8">
              <EditStepNav currentPath="/agents/collect" agentId={editId} />
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
