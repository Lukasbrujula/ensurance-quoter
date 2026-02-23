"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Users,
  Phone,
  TrendingUp,
  Zap,
  UserPlus,
  Clock,
  Bot,
  ArrowRight,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/auth/auth-provider"
import type { DashboardStats, FollowUpItem } from "@/lib/supabase/dashboard"
import type { ActivityLog, ActivityType } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  Activity type config                                               */
/* ------------------------------------------------------------------ */

const ACTIVITY_CONFIG: Record<ActivityType, { icon: typeof Users; color: string }> = {
  lead_created: { icon: UserPlus, color: "text-green-600 bg-green-50" },
  status_change: { icon: ArrowRight, color: "text-blue-600 bg-blue-50" },
  call: { icon: Phone, color: "text-violet-600 bg-violet-50" },
  quote: { icon: Zap, color: "text-amber-600 bg-amber-50" },
  enrichment: { icon: Users, color: "text-cyan-600 bg-cyan-50" },
  follow_up: { icon: Clock, color: "text-orange-600 bg-orange-50" },
  note: { icon: Users, color: "text-gray-600 bg-gray-50" },
  lead_updated: { icon: Users, color: "text-slate-600 bg-slate-50" },
}

/* ------------------------------------------------------------------ */
/*  Follow-up grouping helpers                                         */
/* ------------------------------------------------------------------ */

function groupFollowUps(items: FollowUpItem[]): Record<string, FollowUpItem[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86400000)
  const endOfWeek = new Date(today.getTime() + 7 * 86400000)

  const groups: Record<string, FollowUpItem[]> = {}

  for (const item of items) {
    const d = new Date(item.followUpDate)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    let label: string
    if (dayStart < today) label = "Overdue"
    else if (dayStart.getTime() === today.getTime()) label = "Today"
    else if (dayStart.getTime() === tomorrow.getTime()) label = "Tomorrow"
    else if (dayStart < endOfWeek) label = "This Week"
    else label = "Next Week"

    const existing = groups[label] ?? []
    groups[label] = [...existing, item]
  }

  return groups
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardClient() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const firstName =
    (user?.user_metadata?.first_name as string) ??
    user?.email?.split("@")[0] ??
    "Agent"

  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/dashboard/stats")
      if (!res.ok) throw new Error("Failed to load stats")
      const data: DashboardStats = await res.json()
      setStats(data)
    } catch {
      setError("Unable to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-[#e2e8f0]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-[#f1f5f9]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-lg bg-[#f1f5f9]" />
          <div className="h-80 animate-pulse rounded-lg bg-[#f1f5f9]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={loadStats}>
          Retry
        </Button>
      </div>
    )
  }

  if (!stats) return null

  const grouped = groupFollowUps(stats.upcomingFollowUps)
  const groupOrder = ["Overdue", "Today", "Tomorrow", "This Week", "Next Week"]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Good {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s your pipeline at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/quote">
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              New Quote
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/leads">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              View Leads
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.leads.total}
          subtitle={`${stats.leads.thisWeek} this week`}
          icon={Users}
        />
        <StatCard
          title="Calls This Week"
          value={stats.calls.thisWeek}
          subtitle={`${stats.calls.thisMonth} this month`}
          icon={Phone}
        />
        <StatCard
          title="Close Rate"
          value={`${stats.closeRate}%`}
          subtitle="Quoted to issued"
          icon={TrendingUp}
        />
        <StatCard
          title="Pipeline"
          value={
            (stats.leads.byStatus["contacted"] ?? 0) +
            (stats.leads.byStatus["quoted"] ?? 0) +
            (stats.leads.byStatus["applied"] ?? 0)
          }
          subtitle="Active opportunities"
          icon={Zap}
        />
      </div>

      {/* Two-column: Follow-ups + Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Clock className="h-4 w-4 text-[#1773cf]" />
              Upcoming Calls & Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingFollowUps.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <Clock className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm">No upcoming calls</p>
                <p className="text-xs">You&apos;re all caught up</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-4">
                  {groupOrder.map((label) => {
                    const items = grouped[label]
                    if (!items || items.length === 0) return null
                    return (
                      <div key={label}>
                        <p className={`text-[11px] font-bold uppercase tracking-wide ${
                          label === "Overdue" ? "text-red-500" : "text-muted-foreground"
                        }`}>
                          {label}
                        </p>
                        <div className="mt-1.5 space-y-1.5">
                          {items.map((fu) => (
                            <FollowUpRow key={fu.leadId} item={fu} isOverdue={label === "Overdue"} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <TrendingUp className="h-4 w-4 text-[#1773cf]" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
                <TrendingUp className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm">No activity yet</p>
                <p className="text-xs">Start by getting a quote or adding a lead</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-1">
                  {stats.recentActivity.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: typeof Users
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff]">
            <Icon className="h-5 w-5 text-[#1773cf]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FollowUpRow({ item, isOverdue }: { item: FollowUpItem; isOverdue: boolean }) {
  const time = new Date(item.followUpDate)
  const timeStr = time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  return (
    <Link
      href={`/leads/${item.leadId}`}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/50"
    >
      <span className={`text-[11px] font-medium tabular-nums ${
        isOverdue ? "text-red-500" : "text-muted-foreground"
      }`}>
        {timeStr}
      </span>
      <span className="flex-1 truncate font-medium text-[13px]">{item.leadName}</span>
      {item.source === "ai_agent" && (
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-violet-100 text-violet-700">
          <Bot className="mr-0.5 h-2.5 w-2.5" />
          AI
        </Badge>
      )}
      {item.followUpNote && (
        <span className="hidden text-[11px] text-muted-foreground sm:inline truncate max-w-[120px]">
          {item.followUpNote}
        </span>
      )}
    </Link>
  )
}

function ActivityRow({ activity }: { activity: ActivityLog }) {
  const config = ACTIVITY_CONFIG[activity.activityType] ?? ACTIVITY_CONFIG.lead_updated
  const Icon = config.icon
  const [iconColor, iconBg] = config.color.split(" ")

  return (
    <Link
      href={`/leads/${activity.leadId}`}
      className="flex items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px] font-medium">{activity.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  return "evening"
}
