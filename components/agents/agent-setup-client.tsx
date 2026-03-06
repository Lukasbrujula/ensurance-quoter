"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  BookOpen,
  Loader2,
  Phone,
  Save,
  User,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { US_STATES } from "@/lib/data/us-states"
import type { AiAgentRow, BusinessHours } from "@/lib/types/database"
import { BusinessHoursEditor } from "./business-hours-editor"
import { EditStepNav } from "./edit-step-nav"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KB_MAX = 5000

/* ------------------------------------------------------------------ */
/*  Form state type                                                    */
/* ------------------------------------------------------------------ */

interface SetupFormState {
  name: string
  businessName: string
  agentName: string
  state: string
  phoneNumber: string
  callForwardNumber: string
  businessHours: BusinessHours | null
  afterHoursGreeting: string
  knowledgeBase: string
}

const INITIAL_STATE: SetupFormState = {
  name: "",
  businessName: "",
  agentName: "",
  state: "",
  phoneNumber: "",
  callForwardNumber: "",
  businessHours: {
    timezone: "America/New_York",
    schedule: {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
      saturday: null,
      sunday: null,
    },
  },
  afterHoursGreeting: "",
  knowledgeBase: "",
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SetupSkeleton() {
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

export function AgentSetupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")

  const [form, setForm] = useState<SetupFormState>(INITIAL_STATE)
  const [original, setOriginal] = useState<SetupFormState>(INITIAL_STATE)
  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof SetupFormState, string>>>({})

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

        const loaded: SetupFormState = {
          name: agent.name ?? "",
          businessName: agent.description ?? "",
          agentName: agent.name ?? "",
          state: "",
          phoneNumber: agent.phone_number ?? "",
          callForwardNumber: agent.call_forward_number ?? "",
          businessHours: agent.business_hours,
          afterHoursGreeting: agent.after_hours_greeting ?? "",
          knowledgeBase: agent.knowledge_base ?? "",
        }
        setForm(loaded)
        setOriginal(loaded)
      } catch (error) {
        toast.error("Failed to load agent details")
        console.error("fetchAgent error:", error instanceof Error ? error.message : String(error))
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [editId])

  // Field updater (immutable)
  const updateField = useCallback(
    <K extends keyof SetupFormState>(key: K, value: SetupFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => {
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    [],
  )

  // Dirty check
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(original),
    [form, original],
  )

  // Validation
  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof SetupFormState, string>> = {}

    if (!form.name.trim()) {
      next.name = "Agent name is required"
    }

    if (form.knowledgeBase.length > KB_MAX) {
      next.knowledgeBase = `Knowledge base exceeds ${KB_MAX.toLocaleString()} character limit`
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }, [form])

  // Save handler
  const handleSave = useCallback(async () => {
    if (!validate()) return

    setSaving(true)
    try {
      if (isEditMode && editId) {
        // Update existing agent
        const res = await fetch(`/api/agents/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.businessName || null,
            phone_number: form.phoneNumber || null,
            knowledge_base: form.knowledgeBase || null,
            business_hours: form.businessHours,
            after_hours_greeting: form.afterHoursGreeting || null,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error ?? "Failed to update agent")
        }

        toast.success("Agent settings saved")
        setOriginal(form)
      } else {
        // Create new agent
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.businessName || undefined,
            phone_number: form.phoneNumber || undefined,
            business_name: form.businessName || undefined,
          }),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error ?? "Failed to create agent")
        }

        const json = await res.json()
        toast.success("Agent created successfully")
        router.push(`/agents/${json.agent.id}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [form, isEditMode, editId, validate, router])

  if (loading) return <SetupSkeleton />

  const kbCount = form.knowledgeBase.length
  const kbOverLimit = kbCount > KB_MAX

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 gap-1.5 text-muted-foreground"
            onClick={() => router.push("/agents")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEditMode ? "Edit Agent Setup" : "New Agent Setup"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEditMode
              ? "Update your agent's business information and configuration."
              : "Set up your agent's business info, phone numbers, and knowledge base."}
          </p>
        </div>

        <div className="space-y-6">
          {/* Agent Identity */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Agent Identity</CardTitle>
              </div>
              <CardDescription>
                Name your agent and provide business context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Agent Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. Office Assistant"
                    maxLength={200}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    placeholder="e.g. Smith Insurance Group"
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agentName">Your Name</Label>
                  <Input
                    id="agentName"
                    value={form.agentName}
                    onChange={(e) => updateField("agentName", e.target.value)}
                    placeholder="e.g. John Smith"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will reference you by this name to callers.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => updateField("state", v)}
                  >
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phone Numbers */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Phone Numbers</CardTitle>
              </div>
              <CardDescription>
                Configure your Telnyx phone number and call forwarding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Telnyx Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(e) => updateField("phoneNumber", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground">
                    The number callers will reach your AI agent on.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="callForwardNumber">
                    Call Forward Number
                  </Label>
                  <Input
                    id="callForwardNumber"
                    type="tel"
                    value={form.callForwardNumber}
                    onChange={(e) =>
                      updateField("callForwardNumber", e.target.value)
                    }
                    placeholder="+1 (555) 000-0000"
                    maxLength={30}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where to transfer callers who want to speak to a human.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Business Hours</CardTitle>
              </div>
              <CardDescription>
                Set your weekly schedule. The AI will share hours when asked and
                use the after-hours greeting outside these times.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessHoursEditor
                hours={form.businessHours}
                afterHoursGreeting={form.afterHoursGreeting}
                onHoursChange={(hours) => updateField("businessHours", hours)}
                onAfterHoursGreetingChange={(greeting) =>
                  updateField("afterHoursGreeting", greeting)
                }
              />
            </CardContent>
          </Card>

          {/* Knowledge Base */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Knowledge Base</CardTitle>
              </div>
              <CardDescription>
                Add information your AI agent can use to answer caller questions
                — FAQ answers, service descriptions, office policies, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={form.knowledgeBase}
                onChange={(e) => updateField("knowledgeBase", e.target.value)}
                placeholder="e.g. We offer term life, whole life, and universal life policies. We serve clients in all 50 states. Our minimum coverage is $25,000..."
                rows={6}
                maxLength={KB_MAX + 100}
                className={kbOverLimit ? "border-destructive" : ""}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  The AI will use this to answer general questions. It will not
                  read it back verbatim.
                </p>
                <p
                  className={`text-xs tabular-nums ${
                    kbOverLimit
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {kbCount.toLocaleString()} / {KB_MAX.toLocaleString()}
                </p>
              </div>
              {errors.knowledgeBase && (
                <p className="text-xs text-destructive">
                  {errors.knowledgeBase}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Separator />
          <div className="flex items-center justify-between pb-4">
            <Button
              variant="outline"
              onClick={() =>
                editId ? router.push(`/agents/${editId}`) : router.push("/agents")
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || (!isDirty && isEditMode) || kbOverLimit}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : isEditMode ? (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Create Agent
                </>
              )}
            </Button>
          </div>

          {/* Step navigation */}
          {editId && (
            <div className="pb-8">
              <EditStepNav currentPath="/agents/setup" agentId={editId} />
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
