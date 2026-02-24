"use client"

import { useState, useEffect, useCallback } from "react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { CreateAgentDialog } from "./create-agent-dialog"
import type { AiAgentRow } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const WIZARD_STORAGE_KEY = "ensurance_wizard_state"

export function AgentsListClient() {
  const [agents, setAgents] = useState<AiAgentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
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
              onToggle={(enabled) => handleToggle(agent, enabled)}
            />
          ))}
        </div>
      )}

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
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
/*  Agent Card                                                         */
/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  onToggle,
}: {
  agent: AiAgentRow
  onToggle: (enabled: boolean) => void
}) {
  const isActive = agent.status === "active"
  const isError = agent.status === "error"

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-[15px]">{agent.name}</CardTitle>
              {agent.description && (
                <CardDescription className="mt-0.5 line-clamp-2 text-[12px]">
                  {agent.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AgentStatusBadge status={agent.status} />
            {!isError && (
              <Switch
                checked={isActive}
                onCheckedChange={onToggle}
                aria-label={`Toggle ${agent.name}`}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-0">
        {/* Phone number */}
        {agent.phone_number && (
          <div className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span className="font-mono">{agent.phone_number}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
          <span className="font-medium tabular-nums">{agent.total_calls} calls</span>
          <span className="text-border">|</span>
          <span className="tabular-nums">{agent.total_minutes.toFixed(1)} min</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground/70">
          <Clock className="h-3 w-3" />
          <span>
            {agent.last_call_at
              ? formatRelativeTime(agent.last_call_at)
              : "No calls yet"}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-4 mt-5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-[12px]"
            onClick={() => {
              // Navigate to agent detail with test-call intent
              window.location.href = `/agents/${agent.id}?action=test-call`
            }}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Test Call
          </Button>
          <Link href={`/agents/${agent.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-[12px]"
            >
              <Settings2 className="h-3.5 w-3.5" />
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
          <Card key={i}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
              <div className="flex gap-2 border-t border-border pt-4 mt-2">
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
