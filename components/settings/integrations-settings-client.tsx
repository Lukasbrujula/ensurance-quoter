"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Bot,
  Clock,
  DollarSign,
  Mail,
  Phone,
  Power,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsPageHeader } from "./settings-page-header"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface AIAgentStatus {
  enabled: boolean
  assistantId: string | null
  hasAssistant: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function IntegrationsSettingsClient() {
  const [status, setStatus] = useState<AIAgentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-agent")
      if (!res.ok) throw new Error("Failed to fetch status")
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      console.error("Failed to load AI agent status:", error)
      toast.error("Failed to load AI agent status")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStatus()
  }, [fetchStatus])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/ai-agent", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create AI agent")
      }
      toast.success("AI voice agent created successfully")
      await fetchStatus()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create AI agent"
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (enabled: boolean) => {
    if (!status?.hasAssistant && enabled) {
      await handleCreate()
      return
    }

    setToggling(true)
    try {
      const res = await fetch("/api/ai-agent/toggle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })

      if (!res.ok) {
        const data = await res.json()
        // If assistant was deleted on Telnyx, offer recreation
        if (res.status === 404) {
          toast.error("AI assistant no longer exists. Recreating...", {
            action: {
              label: "Recreate",
              onClick: () => void handleCreate(),
            },
          })
          await fetchStatus()
          return
        }
        throw new Error(data.error || "Failed to toggle AI agent")
      }

      toast.success(enabled ? "AI agent enabled" : "AI agent disabled")
      await fetchStatus()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to toggle AI agent"
      toast.error(message)
    } finally {
      setToggling(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch("/api/ai-agent", { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete AI agent")
      toast.success("AI agent removed")
      await fetchStatus()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete AI agent"
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <SettingsPageHeader
        title="Integrations"
        description="Connect third-party tools and services to streamline your workflow."
      />

      <div className="space-y-6">
        {/* AI Voice Agent Card */}
        {loading ? (
          <AIAgentSkeleton />
        ) : (
          <AIAgentCard
            status={status}
            toggling={toggling}
            creating={creating}
            deleting={deleting}
            onToggle={handleToggle}
            onCreate={handleCreate}
            onDelete={handleDelete}
          />
        )}

        {/* Coming Soon integrations */}
        <ComingSoonCard
          icon={DollarSign}
          title="Compulife Pricing API"
          description="Real carrier pricing with live rate tables."
        />
        <ComingSoonCard
          icon={Mail}
          title="Email Service (SendGrid)"
          description="Automated follow-up emails and notifications."
        />
        <ComingSoonCard
          icon={Search}
          title="Lead Enrichment (PDL)"
          description="Auto-configure People Data Labs enrichment settings."
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  AI Agent Card                                                       */
/* ------------------------------------------------------------------ */

function AIAgentCard({
  status,
  toggling,
  creating,
  deleting,
  onToggle,
  onCreate,
  onDelete,
}: {
  status: AIAgentStatus | null
  toggling: boolean
  creating: boolean
  deleting: boolean
  onToggle: (enabled: boolean) => Promise<void>
  onCreate: () => Promise<void>
  onDelete: () => Promise<void>
}) {
  const isEnabled = status?.enabled ?? false
  const hasAssistant = status?.hasAssistant ?? false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">
                AI Voice Agent (Telnyx)
              </CardTitle>
              <CardDescription>
                Answers calls when you are unavailable and collects caller info
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusIndicator enabled={isEnabled} hasAssistant={hasAssistant} />
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => void onToggle(checked)}
              disabled={toggling || creating}
            />
          </div>
        </div>
      </CardHeader>

      {(hasAssistant || isEnabled) && (
        <CardContent className="space-y-4">
          <Separator />

          {/* Personality preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium">AI Personality</p>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm italic text-muted-foreground">
                &quot;Hi, you&apos;ve reached your office. They&apos;re not
                available right now, but I can take some information so they can
                call you back. How can I help?&quot;
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              The AI collects the caller&apos;s name, callback number, reason
              for calling, and preferred callback time, then creates a lead in
              your CRM.
            </p>
          </div>

          {/* What the AI collects */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Information Collected</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Caller name",
                "Callback number",
                "Reason for call",
                "Callback preference",
                "Urgency level",
              ].map((item) => (
                <Badge key={item} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          {/* Phone number display */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Phone Number</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>
                Configure your Telnyx phone number to route unanswered calls to
                the AI agent
              </span>
            </div>
          </div>

          {/* Test call */}
          {hasAssistant && status?.assistantId && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Test Call</p>
              <p className="text-xs text-muted-foreground">
                Test your AI agent by making a browser call. Open the Telnyx
                widget to hear what callers experience.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  window.open(
                    `https://ai.telnyx.com/widget/${status.assistantId}`,
                    "_blank",
                    "width=400,height=600",
                  )
                }}
              >
                <Phone className="h-4 w-4" />
                Make a Test Call
              </Button>
            </div>
          )}

          <Separator />

          {/* Danger zone */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Remove AI Agent</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete the AI assistant from Telnyx
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => void onDelete()}
              disabled={deleting}
            >
              {deleting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </Button>
          </div>
        </CardContent>
      )}

      {!hasAssistant && !isEnabled && (
        <CardContent>
          <Separator className="mb-4" />
          <div className="text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Enable the toggle above to create your AI voice agent. It will
              answer calls when you&apos;re unavailable and collect caller
              information into your CRM.
            </p>
            <Button
              className="gap-2"
              onClick={() => void onCreate()}
              disabled={creating}
            >
              {creating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Power className="h-4 w-4" />
              )}
              Set Up AI Agent
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Status indicator                                                    */
/* ------------------------------------------------------------------ */

function StatusIndicator({
  enabled,
  hasAssistant,
}: {
  enabled: boolean
  hasAssistant: boolean
}) {
  if (enabled && hasAssistant) {
    return (
      <Badge
        variant="secondary"
        className="gap-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      >
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Active
      </Badge>
    )
  }

  if (hasAssistant && !enabled) {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        Inactive
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="gap-1.5">
      <span className="h-2 w-2 rounded-full bg-gray-400" />
      Not configured
    </Badge>
  )
}

/* ------------------------------------------------------------------ */
/*  Coming Soon cards                                                   */
/* ------------------------------------------------------------------ */

function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card className="opacity-60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
      </CardHeader>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function AIAgentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-60" />
            </div>
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </CardHeader>
    </Card>
  )
}
