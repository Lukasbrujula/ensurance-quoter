"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Bot,
  Phone,
  RefreshCw,
  Save,
  Trash2,
  User,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
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
import { TranscriptViewer } from "./transcript-viewer"
import { FAQEditor } from "./faq-editor"
import { BusinessHoursEditor } from "./business-hours-editor"
import type {
  AiAgentRow,
  AiAgentCallRow,
  FAQEntry,
  BusinessHours,
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
  recentCalls: AiAgentCallRow[]
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
      console.error("Failed to load agent:", error)
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

        {/* Business Hours */}
        <BusinessHoursSection
          agent={data.agent}
          onSaved={() => void fetchAgent()}
        />

        {/* Call History */}
        <CallHistorySection
          agentId={agentId}
          calls={data.recentCalls}
          stats={data.stats}
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
/*  Configuration section                                              */
/* ------------------------------------------------------------------ */

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
  const [voice, setVoice] = useState(agent.voice ?? "Telnyx.NaturalHD.astra")
  const [isActive, setIsActive] = useState(agent.status === "active")
  const [saving, setSaving] = useState(false)

  const isDirty =
    name !== agent.name ||
    description !== (agent.description ?? "") ||
    phoneNumber !== (agent.phone_number ?? "") ||
    greeting !== (agent.greeting ?? "") ||
    voice !== (agent.voice ?? "Telnyx.NaturalHD.astra") ||
    isActive !== (agent.status === "active")

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
          voice,
          status: isActive ? "active" : "inactive",
        }),
      })

      if (!res.ok) throw new Error("Failed to save")
      toast.success("Agent configuration saved")
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
            rows={3}
            maxLength={2000}
          />
          <p className="text-xs text-muted-foreground">
            The first thing the AI says to callers. Leave blank for the default
            greeting.
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

        {/* Test call */}
        {agent.telnyx_assistant_id && (
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
                onClick={() => {
                  window.open(
                    `https://ai.telnyx.com/widget/${agent.telnyx_assistant_id}`,
                    "_blank",
                    "width=400,height=600",
                  )
                }}
              >
                <Phone className="h-4 w-4" />
                Test Call
              </Button>
            </div>
          </>
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
      toast.success("FAQ entries saved")
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
      toast.success("Business hours saved")
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
/*  Call History section                                                */
/* ------------------------------------------------------------------ */

function CallHistorySection({
  agentId,
  calls,
  stats,
}: {
  agentId: string
  calls: AiAgentCallRow[]
  stats: { totalCalls: number; totalMinutes: number; lastCallAt: string | null }
}) {
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Call History</CardTitle>
            <CardDescription>
              {stats.totalCalls} calls | {stats.totalMinutes.toFixed(1)} minutes
              total
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <div className="py-8 text-center">
            <Phone className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No calls yet. Once your agent is active, calls will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => (
              <CallRow
                key={call.id}
                call={call}
                agentId={agentId}
                expanded={expandedCallId === call.id}
                onToggle={() =>
                  setExpandedCallId((prev) =>
                    prev === call.id ? null : call.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Call row                                                           */
/* ------------------------------------------------------------------ */

function CallRow({
  call,
  agentId,
  expanded,
  onToggle,
}: {
  call: AiAgentCallRow
  agentId: string
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50"
      >
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {call.caller_name ?? "Unknown caller"}
            </p>
            <p className="text-xs text-muted-foreground">
              {call.reason ?? "No reason recorded"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {call.caller_phone && (
            <span className="text-xs text-muted-foreground">
              {call.caller_phone}
            </span>
          )}
          <CallStatusBadge processed={call.processed} leadId={call.lead_id} />
          <span className="text-xs text-muted-foreground">
            {call.created_at ? formatRelativeTime(call.created_at) : ""}
          </span>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3">
          {/* Call details */}
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {call.callback_number && (
              <span>Callback: {call.callback_number}</span>
            )}
            {call.callback_time && (
              <span>Preferred time: {call.callback_time}</span>
            )}
            {call.state && <span>State: {call.state}</span>}
            {call.age_range && <span>Age: {call.age_range}</span>}
            {call.urgency && <span>Urgency: {call.urgency}</span>}
          </div>

          {call.notes && (
            <p className="mb-3 text-xs text-muted-foreground">
              Notes: {call.notes}
            </p>
          )}

          {/* Transcript */}
          <TranscriptViewer callId={call.id} agentId={agentId} />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Call status badge                                                  */
/* ------------------------------------------------------------------ */

function CallStatusBadge({
  processed,
  leadId,
}: {
  processed: boolean | null
  leadId: string | null
}) {
  if (leadId) {
    return (
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-700 text-xs dark:bg-green-900/30 dark:text-green-400"
      >
        Lead created
      </Badge>
    )
  }
  if (processed) {
    return (
      <Badge variant="secondary" className="text-xs">
        Processed
      </Badge>
    )
  }
  return (
    <Badge
      variant="secondary"
      className="bg-yellow-100 text-yellow-700 text-xs dark:bg-yellow-900/30 dark:text-yellow-400"
    >
      Processing
    </Badge>
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
