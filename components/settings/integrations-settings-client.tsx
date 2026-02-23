"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import {
  Bot,
  Clock,
  DollarSign,
  ExternalLink,
  Mail,
  Search,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsPageHeader } from "./settings-page-header"
import { GoogleCalendarCard } from "./google-calendar-card"

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function IntegrationsSettingsClient() {
  const [agentCount, setAgentCount] = useState<number | null>(null)
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchAgentStats = useCallback(async () => {
    try {
      const res = await fetch("/api/agents")
      if (!res.ok) return
      const data = await res.json()
      const agents = data.agents ?? []
      setAgentCount(agents.length)
      setActiveCount(
        agents.filter((a: { status: string }) => a.status === "active").length,
      )
    } catch {
      // Non-critical — just show "Manage" without counts
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchAgentStats()
  }, [fetchAgentStats])

  return (
    <div>
      <SettingsPageHeader
        title="Integrations"
        description="Connect third-party tools and services to streamline your workflow."
      />

      <div className="space-y-6">
        {/* AI Voice Agents — links to /agents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    AI Voice Agents (Telnyx)
                  </CardTitle>
                  <CardDescription>
                    AI agents that answer calls and collect caller information
                    into your CRM.
                  </CardDescription>
                </div>
              </div>

              {loading ? (
                <Skeleton className="h-6 w-16 rounded-full" />
              ) : agentCount !== null && agentCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  {activeCount} active
                </Badge>
              ) : (
                <Badge variant="secondary">Not configured</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/agents">
                <ExternalLink className="h-4 w-4" />
                Manage Agents
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Google Calendar */}
        <Suspense fallback={<Skeleton className="h-28 rounded-lg" />}>
          <GoogleCalendarCard />
        </Suspense>

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
