"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Bot,
  Plus,
  RefreshCw,
  Phone,
  Clock,
  AlertTriangle,
  PhoneCall,
  Settings2,
  MessageSquareQuote,
  UserPlus,
  CalendarPlus,
  Bell,
  Globe,
  BarChart3,
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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateAgentDialog } from "./create-agent-dialog"
import type { AiAgentRow, CollectFieldId, PostCallActionId } from "@/lib/types/database"
import type { ExtractionStats } from "@/lib/supabase/calls"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const WIZARD_STORAGE_KEY = "ensurance_wizard_state"

export function AgentsListClient() {
  const [agents, setAgents] = useState<AiAgentRow[]>([])
  const [extractionStats, setExtractionStats] = useState<ExtractionStats>({ total: 0, succeeded: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [testCallAssistantId, setTestCallAssistantId] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Auto-open wizard when returning from Google OAuth
  useEffect(() => {
    const googleParam = searchParams.get("google")
    if (!googleParam) return

    if (googleParam === "connected") {
      // Saved wizard state exists → re-open the create dialog
      const hasSavedState = !!sessionStorage.getItem(WIZARD_STORAGE_KEY)
      if (hasSavedState) {
        setCreateOpen(true)
        toast.success("Google Calendar connected")
      }
    } else if (googleParam === "error") {
      toast.error("Failed to connect Google Calendar")
    } else if (googleParam === "cancelled") {
      toast.info("Google Calendar connection cancelled")
      // Still re-open wizard if state was saved
      const hasSavedState = !!sessionStorage.getItem(WIZARD_STORAGE_KEY)
      if (hasSavedState) {
        setCreateOpen(true)
      }
    }

    // Clean up URL params
    const url = new URL(window.location.href)
    url.searchParams.delete("google")
    window.history.replaceState({}, "", url.pathname)
  }, [searchParams])

  const fetchAgents = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/agents")
      if (!res.ok) throw new Error("Failed to fetch agents")
      const data = await res.json()
      setAgents(data.agents ?? [])
      if (data.extractionStats) setExtractionStats(data.extractionStats)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load agents"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAgents()
  }, [fetchAgents])

  const handleToggle = async (agent: AiAgentRow, enabled: boolean) => {
    const newStatus = enabled ? "active" : "inactive"
    // Optimistic update
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agent.id ? { ...a, status: newStatus } : a,
      ),
    )

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to toggle agent")
      toast.success(enabled ? "Agent enabled" : "Agent disabled")
    } catch {
      // Revert optimistic update
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agent.id ? { ...a, status: agent.status } : a,
        ),
      )
      toast.error("Failed to toggle agent")
    }
  }

  const handleCreated = () => {
    setCreateOpen(false)
    void fetchAgents()
  }

  if (loading) return <AgentsListSkeleton />

  if (error) {
    return (
      <div>
        <PageHeader onCreateClick={() => setCreateOpen(true)} />
        <div className="mt-8 flex flex-col items-center justify-center gap-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true)
              void fetchAgents()
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader onCreateClick={() => setCreateOpen(true)} />

      {agents.length === 0 ? (
        <EmptyState onCreateClick={() => setCreateOpen(true)} />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              extractionStats={extractionStats}
              onToggle={(enabled) => handleToggle(agent, enabled)}
              onTestCall={() => {
                if (agent.telnyx_assistant_id) {
                  setTestCallAssistantId(agent.telnyx_assistant_id)
                } else {
                  toast.error("This agent has no Telnyx assistant configured")
                }
              }}
            />
          ))}
        </div>
      )}

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      {testCallAssistantId && (
        <TestCallOverlay
          assistantId={testCallAssistantId}
          onClose={() => setTestCallAssistantId(null)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Header                                                        */
/* ------------------------------------------------------------------ */

function PageHeader({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Agents</h1>
        <p className="text-sm text-muted-foreground">
          Manage your AI voice agents that handle calls when you&apos;re
          unavailable.
        </p>
      </div>
      <Button size="sm" className="gap-2" onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        Create Agent
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Label maps                                                         */
/* ------------------------------------------------------------------ */

const COLLECT_FIELD_LABELS: Record<CollectFieldId, string> = {
  name: "Name",
  phone: "Phone",
  reason: "Reason",
  callback_time: "Callback",
  email: "Email",
  date_of_birth: "DOB",
  state: "State",
}

const TONE_PRESET_LABELS: Record<string, string> = {
  warm: "Warm",
  professional: "Professional",
  direct: "Direct",
  casual: "Casual",
}

const POST_CALL_ACTION_CONFIG: Record<
  PostCallActionId,
  { label: string; icon: typeof UserPlus }
> = {
  save_lead: { label: "Save lead", icon: UserPlus },
  book_calendar: { label: "Calendar", icon: CalendarPlus },
  send_notification: { label: "Notify", icon: Bell },
}

/* ------------------------------------------------------------------ */
/*  Agent Card                                                         */
/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  extractionStats,
  onToggle,
  onTestCall,
}: {
  agent: AiAgentRow
  extractionStats: ExtractionStats
  onToggle: (enabled: boolean) => void
  onTestCall: () => void
}) {
  const isActive = agent.status === "active"
  const isError = agent.status === "error"
  const collectFields = agent.collect_fields ?? []
  const postCallActions = agent.post_call_actions ?? []
  const toneLabel = agent.tone_preset ? TONE_PRESET_LABELS[agent.tone_preset] : null
  const canTestCall = Boolean(agent.telnyx_assistant_id)
  const extractionRate =
    extractionStats.total > 0
      ? Math.round((extractionStats.succeeded / extractionStats.total) * 100)
      : null

  return (
    <Card className="flex min-h-[280px] flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="truncate text-[15px]">{agent.name}</CardTitle>
                {agent.spanish_enabled && (
                  <Badge
                    variant="outline"
                    className="gap-0.5 px-1 py-0 text-[10px] font-normal shrink-0"
                  >
                    <Globe className="h-2.5 w-2.5" />
                    ES
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                {agent.description && (
                  <CardDescription className="line-clamp-1 text-[12px]">
                    {agent.description}
                  </CardDescription>
                )}
                {toneLabel && (
                  <span className="shrink-0 text-[11px] text-muted-foreground/50">
                    {agent.description ? "·" : ""} {toneLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <AgentStatusBadge status={agent.status} />
            {!isError && (
              <>
                <Separator orientation="vertical" className="h-5" />
                <Switch
                  checked={isActive}
                  onCheckedChange={onToggle}
                  aria-label={`Toggle ${agent.name}`}
                />
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-0">
        {/* Greeting preview */}
        {agent.greeting && (
          <div className="mb-3 flex items-start gap-2">
            <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <p className="line-clamp-2 text-[12px] italic text-muted-foreground">
              &ldquo;{agent.greeting}&rdquo;
            </p>
          </div>
        )}

        {/* Collects fields pills */}
        {collectFields.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              Collects
            </p>
            <div className="flex flex-wrap gap-1">
              {collectFields.map((field) => (
                <Badge
                  key={field}
                  variant="outline"
                  className="px-1.5 py-0 text-[11px] font-normal"
                >
                  {COLLECT_FIELD_LABELS[field] ?? field}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* After-call actions */}
        {postCallActions.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
              After call
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {postCallActions.map((action) => {
                const config = POST_CALL_ACTION_CONFIG[action]
                if (!config) return null
                const Icon = config.icon
                return (
                  <span
                    key={action}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground"
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Phone + stats — secondary row */}
        <div className="mt-auto flex items-center gap-3 text-[12px] text-muted-foreground/60 flex-wrap">
          {agent.phone_number && (
            <>
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span className="font-mono">{agent.phone_number}</span>
              </span>
              <span className="text-border">·</span>
            </>
          )}
          {agent.total_calls > 0 ? (
            <>
              <span className="tabular-nums">{agent.total_calls} calls</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {agent.last_call_at
                  ? formatRelativeTime(agent.last_call_at)
                  : "No calls yet"}
              </span>
              {extractionRate !== null && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {extractionRate}% extracted
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-muted-foreground/40">No calls yet</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-border pt-4 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] flex-1 gap-1.5 text-[12px] sm:min-h-0 cursor-pointer"
            onClick={onTestCall}
            disabled={!canTestCall}
            title={canTestCall ? "Make a test call" : "Deploy agent first to enable test calls"}
          >
            <PhoneCall className="h-3.5 w-3.5 shrink-0" />
            Test Call
          </Button>
          <Link href={`/agents/${agent.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] w-full gap-1.5 text-[12px] sm:min-h-0 cursor-pointer"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              Edit Agent
            </Button>
          </Link>
        </div>
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
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30">
        <Bot className="h-8 w-8 text-violet-600 dark:text-violet-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">No AI agents yet</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Create your first AI voice agent to handle calls when you&apos;re
          unavailable. The AI will collect caller information and create leads in
          your CRM.
        </p>
      </div>
      <Button className="gap-2" onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        Create Agent
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function AgentsListSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="min-h-[280px]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col pt-0 space-y-3">
              <Skeleton className="h-8 w-full rounded" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <div className="mt-auto flex gap-3 border-t border-border pt-4">
                <Skeleton className="h-8 flex-1 rounded-md" />
                <Skeleton className="h-8 flex-1 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Test Call overlay — embeds Telnyx AI widget                        */
/* ------------------------------------------------------------------ */

function TestCallOverlay({
  assistantId,
  onClose,
}: {
  assistantId: string
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const SCRIPT_ID = "telnyx-ai-widget-script"
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src = "https://unpkg.com/@telnyx/ai-agent-widget"
      script.async = true
      document.head.appendChild(script)
    }

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
  }, [assistantId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[420px] rounded-lg bg-background p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Test Call</p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div
          ref={containerRef}
          className="flex min-h-[400px] items-center justify-center"
        />
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
