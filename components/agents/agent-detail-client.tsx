"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Bot,
  BookOpen,
  Building2,
  Calendar,
  Check,
  ExternalLink,
  Globe,
  ListChecks,
  Loader2,
  Phone,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  AlertTriangle,
  Languages,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CallLogsList } from "./call-logs-list"
import { CallDetailPanel } from "./call-detail-panel"
import { FAQEditor } from "./faq-editor"
import { BusinessHoursEditor } from "./business-hours-editor"
import type {
  AiAgentRow,
  FAQEntry,
  BusinessHours,
  CollectFieldId,
  PostCallActionId,
} from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Voice options                                                      */
/* ------------------------------------------------------------------ */

const VOICE_OPTIONS = [
  { value: "Telnyx.NaturalHD.astra", label: "Astra (Natural HD)" },
  { value: "Telnyx.NaturalHD.celeste", label: "Celeste (Natural HD)" },
  { value: "Telnyx.NaturalHD.orion", label: "Orion (Natural HD)" },
  { value: "Telnyx.NaturalHD.nova", label: "Nova (Natural HD)" },
] as const

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentDetailResponse {
  agent: AiAgentRow
  recentCalls: Record<string, unknown>[]
  stats: {
    totalCalls: number
    totalMinutes: number
    lastCallAt: string | null
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgentDetailClient({ agentId }: { agentId: string }) {
  const router = useRouter()
  const [data, setData] = useState<AgentDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const fetchAgent = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}`)
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      if (!res.ok) throw new Error("Failed to fetch agent")
      const json = await res.json()
      setData(json)
    } catch (error) {
      console.error("Failed to load agent:", error instanceof Error ? error.message : String(error))
      toast.error("Failed to load agent details")
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    void fetchAgent()
  }, [fetchAgent])

  if (loading) return <DetailSkeleton />

  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-4 text-lg font-semibold">Agent not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This agent doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/agents">Back to Agents</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <DetailHeader
        agent={data.agent}
        onDeleted={() => router.push("/agents")}
      />

      {/* Quick config nav */}
      <ConfigNav agentId={agentId} />

      <div className="mt-6 space-y-6">
        {/* Configuration */}
        <ConfigSection
          agent={data.agent}
          onSaved={() => void fetchAgent()}
        />

        {/* FAQ Knowledge Base */}
        <FAQSection
          agent={data.agent}
          onSaved={() => void fetchAgent()}
        />

        {/* Knowledge Base */}
        <KnowledgeBaseSection
          agent={data.agent}
          onSaved={() => void fetchAgent()}
        />

        {/* Business Hours */}
        <BusinessHoursSection
          agent={data.agent}
          onSaved={() => void fetchAgent()}
        />

        {/* Spanish Specialist */}
        <SpanishSpecialistSection
          agent={data.agent}
          onSaved={() => void fetchAgent()}
        />

        {/* Call Logs */}
        <CallLogsSection
          agentId={agentId}
          totalCalls={data.stats.totalCalls}
          totalMinutes={data.stats.totalMinutes}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

function DetailHeader({
  agent,
  onDeleted,
}: {
  agent: AiAgentRow
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete agent")
      toast.success("Agent deleted")
      onDeleted()
    } catch {
      toast.error("Failed to delete agent")
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{agent.name}</h1>
            <AgentStatusBadge status={agent.status} />
          </div>
        </div>
      </div>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-2">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {agent.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the agent and its Telnyx configuration. Call
              history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Config navigation cards                                            */
/* ------------------------------------------------------------------ */

const CONFIG_LINKS = [
  {
    href: (id: string) => `/agents/setup?id=${id}`,
    label: "Business Setup",
    description: "Name, phone, hours, knowledge base",
    Icon: Building2,
  },
  {
    href: (id: string) => `/agents/personality?id=${id}`,
    label: "Personality & Voice",
    description: "Tone, voice, Spanish support",
    Icon: Sparkles,
  },
  {
    href: (id: string) => `/agents/collect?id=${id}`,
    label: "Collection Fields",
    description: "Info to gather, post-call actions",
    Icon: ListChecks,
  },
] as const

function ConfigNav({ agentId }: { agentId: string }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {CONFIG_LINKS.map((link) => (
        <Link
          key={link.label}
          href={link.href(agentId)}
          className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <link.Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{link.label}</p>
            <p className="text-xs text-muted-foreground">{link.description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Test Call — Telnyx AI widget embedded in a dialog                   */
/* ------------------------------------------------------------------ */

function TestCallSection({ assistantId }: { assistantId: string }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    // Load the Telnyx AI widget script once
    const SCRIPT_ID = "telnyx-ai-widget-script"
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src = "https://unpkg.com/@telnyx/ai-agent-widget"
      script.async = true
      document.head.appendChild(script)
    }

    // Insert the custom element into the container
    const container = containerRef.current
    if (container) {
      container.innerHTML = ""
      const widget = document.createElement("telnyx-ai-agent")
      widget.setAttribute("agent-id", assistantId)
      container.appendChild(widget)
    }

    return () => {
      if (container) container.innerHTML = ""
    }
  }, [open, assistantId])

  return (
    <>
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Test Call</p>
          <p className="text-xs text-muted-foreground">
            Open the Telnyx widget to hear what callers experience.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <Phone className="h-4 w-4" />
          Test Call
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[420px] rounded-lg bg-background p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Test Call</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
            <div
              ref={containerRef}
              className="flex min-h-[400px] items-center justify-center"
            />
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Configuration section                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Collect field + post-call action options for edit mode              */
/* ------------------------------------------------------------------ */

const COLLECT_FIELD_OPTIONS: readonly { id: CollectFieldId; label: string; locked?: boolean }[] = [
  { id: "name", label: "Caller's full name", locked: true },
  { id: "phone", label: "Phone number", locked: true },
  { id: "reason", label: "Reason for calling", locked: true },
  { id: "callback_time", label: "Preferred callback time" },
  { id: "email", label: "Email address" },
  { id: "date_of_birth", label: "Date of birth" },
  { id: "state", label: "State of residence" },
] as const

const POST_CALL_ACTION_OPTIONS: readonly { id: PostCallActionId; label: string }[] = [
  { id: "save_lead", label: "Save caller as CRM lead" },
  { id: "book_calendar", label: "Book on Google Calendar" },
  { id: "send_notification", label: "Send in-app notification" },
] as const

function ConfigSection({
  agent,
  onSaved,
}: {
  agent: AiAgentRow
  onSaved: () => void
}) {
  const [name, setName] = useState(agent.name)
  const [description, setDescription] = useState(agent.description ?? "")
  const [phoneNumber, setPhoneNumber] = useState(agent.phone_number ?? "")
  const [greeting, setGreeting] = useState(agent.greeting ?? "")
  const [personality, setPersonality] = useState(agent.personality ?? "")
  const [voice, setVoice] = useState(agent.voice ?? "Telnyx.NaturalHD.astra")
  const [isActive, setIsActive] = useState(agent.status === "active")
  const [collectFields, setCollectFields] = useState<CollectFieldId[]>(
    (agent.collect_fields as CollectFieldId[]) ?? ["name", "phone", "reason", "callback_time"],
  )
  const [postCallActions, setPostCallActions] = useState<PostCallActionId[]>(
    (agent.post_call_actions as PostCallActionId[]) ?? ["save_lead", "book_calendar", "send_notification"],
  )
  const [saving, setSaving] = useState(false)

  // Google Calendar connection status
  const [calendarStatus, setCalendarStatus] = useState<{
    connected: boolean
    email: string | null
    configured: boolean
  } | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchStatus() {
      try {
        const res = await fetch("/api/auth/google/status")
        if (!res.ok) {
          if (!cancelled) setCalendarStatus({ connected: false, email: null, configured: false })
          return
        }
        const data = await res.json()
        if (!cancelled) setCalendarStatus(data)
      } catch {
        if (!cancelled) setCalendarStatus({ connected: false, email: null, configured: false })
      } finally {
        if (!cancelled) setCalendarLoading(false)
      }
    }
    void fetchStatus()
    return () => { cancelled = true }
  }, [])

  const isDirty =
    name !== agent.name ||
    description !== (agent.description ?? "") ||
    phoneNumber !== (agent.phone_number ?? "") ||
    greeting !== (agent.greeting ?? "") ||
    personality !== (agent.personality ?? "") ||
    voice !== (agent.voice ?? "Telnyx.NaturalHD.astra") ||
    isActive !== (agent.status === "active") ||
    JSON.stringify(collectFields) !== JSON.stringify(agent.collect_fields ?? ["name", "phone", "reason", "callback_time"]) ||
    JSON.stringify(postCallActions) !== JSON.stringify(agent.post_call_actions ?? ["save_lead", "book_calendar", "send_notification"])

  const toggleCollectField = (fieldId: CollectFieldId) => {
    setCollectFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId],
    )
  }

  const togglePostCallAction = (actionId: PostCallActionId) => {
    setPostCallActions((prev) =>
      prev.includes(actionId)
        ? prev.filter((a) => a !== actionId)
        : [...prev, actionId],
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          phone_number: phoneNumber.trim() || null,
          greeting: greeting.trim() || null,
          personality: personality.trim() || null,
          voice,
          status: isActive ? "active" : "inactive",
          collect_fields: collectFields,
          post_call_actions: postCallActions,
        }),
      })

      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      if (data.warnings && data.warnings.length > 0) {
        for (const w of data.warnings as string[]) {
          toast.warning(w, { duration: 8000 })
        }
      } else {
        toast.success("Agent configuration saved")
      }
      onSaved()
    } catch {
      toast.error("Failed to save agent configuration")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Configuration</CardTitle>
          <Button
            size="sm"
            className="gap-2"
            disabled={!isDirty || saving}
            onClick={handleSave}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cfg-name">Name</Label>
            <Input
              id="cfg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfg-phone">Phone Number</Label>
            <Input
              id="cfg-phone"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1XXXXXXXXXX"
              maxLength={30}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cfg-description">Description</Label>
          <Input
            id="cfg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this agent handle?"
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cfg-greeting">Greeting</Label>
          <Textarea
            id="cfg-greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="What the AI says when it answers the call..."
            rows={2}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            The first thing the AI says to callers. Use {"{agent}"} for your name.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cfg-personality">Personality</Label>
          <Textarea
            id="cfg-personality"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="You are a friendly, professional receptionist..."
            rows={2}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            How the AI behaves and speaks. Tone, style, persona.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cfg-voice">Voice</Label>
            <Select value={voice} onValueChange={setVoice}>
              <SelectTrigger id="cfg-voice">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                aria-label="Agent active status"
              />
              <span className="text-sm text-muted-foreground">
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Information to Collect */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Information to Collect</Label>
          <div className="grid gap-1 sm:grid-cols-2">
            {COLLECT_FIELD_OPTIONS.map((field) => {
              const checked = collectFields.includes(field.id)
              return (
                <label
                  key={field.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => {
                      if (!field.locked) toggleCollectField(field.id)
                    }}
                    disabled={field.locked}
                  />
                  <span className="text-sm">{field.label}</span>
                  {field.locked && (
                    <span className="text-[10px] text-muted-foreground">(required)</span>
                  )}
                </label>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* After the Call */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">After the Call</Label>
          <div className="grid gap-1 sm:grid-cols-2">
            {POST_CALL_ACTION_OPTIONS.map((action) => {
              const checked = postCallActions.includes(action.id)
              const isCalendarAction = action.id === "book_calendar"
              return (
                <label
                  key={action.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => togglePostCallAction(action.id)}
                  />
                  <span className="text-sm">{action.label}</span>
                  {isCalendarAction && !calendarLoading && calendarStatus?.connected && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <Check className="h-2.5 w-2.5" />
                      Connected
                    </span>
                  )}
                  {isCalendarAction && !calendarLoading && !calendarStatus?.connected && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Not connected
                    </span>
                  )}
                  {isCalendarAction && calendarLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </label>
              )
            })}
          </div>

          {/* Calendar connection banner */}
          {!calendarLoading && calendarStatus?.connected && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/30">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
              <p className="text-[12px] text-green-700 dark:text-green-300">
                Google Calendar connected{calendarStatus.email ? ` as ${calendarStatus.email}` : ""}
              </p>
            </div>
          )}
          {!calendarLoading && !calendarStatus?.connected && postCallActions.includes("book_calendar") && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
                    Google Calendar not connected
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                    Connect your calendar so the agent can book callbacks automatically.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 gap-1.5 text-[12px] border-amber-300 dark:border-amber-700"
                    disabled={!calendarStatus?.configured}
                    onClick={() => {
                      window.location.href = `/api/auth/google?returnTo=/agents/${agent.id}`
                    }}
                    title={
                      calendarStatus?.configured
                        ? "Connect your Google Calendar"
                        : "Google Calendar not configured on this server"
                    }
                  >
                    <Calendar className="h-3 w-3" />
                    Connect Calendar
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test call — embeds Telnyx AI widget for browser-based call */}
        {agent.telnyx_assistant_id && (
          <TestCallSection assistantId={agent.telnyx_assistant_id} />
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ section                                                        */
/* ------------------------------------------------------------------ */

function FAQSection({
  agent,
  onSaved,
}: {
  agent: AiAgentRow
  onSaved: () => void
}) {
  const [entries, setEntries] = useState<FAQEntry[]>(agent.faq_entries ?? [])
  const [saving, setSaving] = useState(false)

  const isDirty = JSON.stringify(entries) !== JSON.stringify(agent.faq_entries ?? [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faq_entries: entries }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      if (data.warnings?.length > 0) {
        for (const w of data.warnings as string[]) toast.warning(w, { duration: 8000 })
      } else {
        toast.success("FAQ entries saved")
      }
      onSaved()
    } catch {
      toast.error("Failed to save FAQ entries")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">FAQ Knowledge Base</CardTitle>
            <CardDescription>
              Add Q&A pairs your AI agent can reference during calls.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-2"
            disabled={!isDirty || saving}
            onClick={handleSave}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <FAQEditor entries={entries} onChange={setEntries} />
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Knowledge Base section                                             */
/* ------------------------------------------------------------------ */

const KB_MAX_CHARS = 2000
const KB_WARN_CHARS = 1800

function KnowledgeBaseSection({
  agent,
  onSaved,
}: {
  agent: AiAgentRow
  onSaved: () => void
}) {
  const [content, setContent] = useState(agent.knowledge_base ?? "")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)

  const isDirty = content !== (agent.knowledge_base ?? "")
  const charCount = content.length
  const isOverLimit = charCount > KB_MAX_CHARS
  const isNearLimit = charCount > KB_WARN_CHARS

  const handlePreview = async () => {
    if (!websiteUrl.trim()) return
    setFetching(true)
    try {
      const res = await fetch(
        `/api/agents/scrape-preview?url=${encodeURIComponent(websiteUrl.trim())}`,
      )
      if (!res.ok) throw new Error("Failed to fetch website content")
      const data = await res.json()
      if (data.text) {
        setContent((prev) => (prev ? `${prev}\n\n${data.text}` : data.text))
      } else {
        toast.error("No text content found on that page")
      }
    } catch {
      toast.error("Could not fetch website content. Try pasting manually.")
    } finally {
      setFetching(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledge_base: content.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      if (data.warnings?.length > 0) {
        for (const w of data.warnings as string[]) toast.warning(w, { duration: 8000 })
      } else {
        toast.success("Knowledge base saved")
      }
      onSaved()
    } catch {
      toast.error("Failed to save knowledge base")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Agent-Specific Knowledge
            </CardTitle>
            <CardDescription>
              Optional override for this agent only. Your global business
              profile (Settings &rarr; Business Info) is already included.
              Add anything extra this specific agent should know.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-2"
            disabled={!isDirty || saving || isOverLimit}
            onClick={handleSave}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Example: Our office hours are 9am-5pm Mon-Fri. We offer term life, whole life, and final expense policies. Our minimum coverage is $25,000..."
            rows={8}
            className={isOverLimit ? "border-red-500 focus-visible:ring-red-500" : ""}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Plain text only. This is combined with FAQ entries above.
            </p>
            <p
              className={`text-xs ${
                isOverLimit
                  ? "font-medium text-red-600 dark:text-red-400"
                  : isNearLimit
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              }`}
            >
              {charCount.toLocaleString()} / {KB_MAX_CHARS.toLocaleString()}
              {isOverLimit && " (over limit — will be truncated)"}
            </p>
          </div>
        </div>

        <Separator />

        {/* Website URL preview */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <Globe className="h-3.5 w-3.5" />
            Website URL (optional)
          </Label>
          <div className="flex gap-2">
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              type="url"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              disabled={!websiteUrl.trim() || fetching}
              onClick={handlePreview}
            >
              {fetching ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Preview
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Click Preview to pull text from your website and append it to the
            knowledge base above.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Business Hours section                                             */
/* ------------------------------------------------------------------ */

function BusinessHoursSection({
  agent,
  onSaved,
}: {
  agent: AiAgentRow
  onSaved: () => void
}) {
  const [hours, setHours] = useState<BusinessHours | null>(
    agent.business_hours ?? null,
  )
  const [afterGreeting, setAfterGreeting] = useState(
    agent.after_hours_greeting ?? "",
  )
  const [saving, setSaving] = useState(false)

  const isDirty =
    JSON.stringify(hours) !== JSON.stringify(agent.business_hours ?? null) ||
    afterGreeting !== (agent.after_hours_greeting ?? "")

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_hours: hours,
          after_hours_greeting: afterGreeting.trim() || null,
        }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      if (data.warnings?.length > 0) {
        for (const w of data.warnings as string[]) toast.warning(w, { duration: 8000 })
      } else {
        toast.success("Business hours saved")
      }
      onSaved()
    } catch {
      toast.error("Failed to save business hours")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Business Hours</CardTitle>
            <CardDescription>
              Set your weekly schedule. The AI will share hours with callers.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-2"
            disabled={!isDirty || saving}
            onClick={handleSave}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <BusinessHoursEditor
          hours={hours}
          afterHoursGreeting={afterGreeting}
          onHoursChange={setHours}
          onAfterHoursGreetingChange={setAfterGreeting}
        />
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Spanish Specialist section                                         */
/* ------------------------------------------------------------------ */

function SpanishSpecialistSection({
  agent,
  onSaved,
}: {
  agent: AiAgentRow
  onSaved: () => void
}) {
  const [enabled, setEnabled] = useState(agent.spanish_enabled)
  const [saving, setSaving] = useState(false)

  const isDirty = enabled !== agent.spanish_enabled

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spanish_enabled: enabled }),
      })
      if (!res.ok) throw new Error("Failed to save")
      const data = await res.json()
      if (data.warnings?.length > 0) {
        for (const w of data.warnings as string[]) toast.warning(w, { duration: 8000 })
      } else {
        toast.success(
          enabled
            ? "Spanish specialist enabled"
            : "Spanish specialist disabled",
        )
      }
      onSaved()
    } catch {
      toast.error("Failed to update Spanish specialist")
    } finally {
      setSaving(false)
    }
  }

  const hasMainAssistant = !!agent.telnyx_assistant_id

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-4 w-4" />
              Spanish Specialist
            </CardTitle>
            <CardDescription>
              Enable a Spanish-speaking specialist agent. Callers who prefer
              Spanish are automatically transferred via handoff.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-2"
            disabled={!isDirty || saving || !hasMainAssistant}
            onClick={handleSave}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasMainAssistant ? (
          <p className="text-sm text-muted-foreground">
            Save the agent configuration first to enable the Spanish specialist.
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <Switch
              id="spanish-toggle"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
            <Label htmlFor="spanish-toggle" className="text-sm">
              Enable Spanish-language specialist agent
            </Label>
            {agent.spanish_agent_assistant_id && (
              <Badge variant="outline" className="ml-auto text-xs">
                Active
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function AgentStatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Active
      </Badge>
    )
  }
  if (status === "error") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Error
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Inactive
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/*  Call Logs section (list + detail panel)                             */
/* ------------------------------------------------------------------ */

function CallLogsSection({
  agentId,
  totalCalls,
  totalMinutes,
}: {
  agentId: string
  totalCalls: number
  totalMinutes: number
}) {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Call Logs</CardTitle>
            <CardDescription>
              {totalCalls} calls | {totalMinutes.toFixed(1)} minutes total
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedCallId ? (
          <CallDetailPanel
            agentId={agentId}
            callId={selectedCallId}
            onClose={() => setSelectedCallId(null)}
          />
        ) : (
          <CallLogsList
            agentId={agentId}
            onSelectCall={(id) => setSelectedCallId(id)}
            selectedCallId={selectedCallId}
          />
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

