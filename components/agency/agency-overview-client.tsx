"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  Phone,
  TrendingUp,
  UserPlus,
  Clock,
  ArrowRight,
  Zap,
  Mail,
  MessageSquare,
  AlertCircle,
  Loader2,
  UserX,
  CheckCircle2,
  Circle,
  AlertTriangle,
  CalendarX,
  RotateCcw,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAuth } from "@clerk/nextjs"
import { useOrgMembers } from "@/hooks/use-org-members"
import type { AgentBreakdownItem } from "@/lib/supabase/dashboard"
import type { ActivityLog, ActivityType } from "@/lib/types/activity"
import type { AgentOnboardingStatus, AgentStatusResponse } from "@/lib/types/agent-status"
import type { SlaSummary } from "@/lib/types/sla"
import type { MissedFollowUpItem } from "@/app/api/org/missed-follow-ups/route"

/* ------------------------------------------------------------------ */
/*  Activity icon / color map                                          */
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
  email_sent: { icon: Mail, color: "text-indigo-600 bg-indigo-50" },
  sms_sent: { icon: MessageSquare, color: "text-teal-600 bg-teal-50" },
  sms_received: { icon: MessageSquare, color: "text-emerald-600 bg-emerald-50" },
  lead_reassigned: { icon: Users, color: "text-orange-600 bg-orange-50" },
  lead_transferred: { icon: Users, color: "text-cyan-600 bg-cyan-50" },
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgencyOverviewClient() {
  const router = useRouter()
  const { orgId, orgRole, isLoaded: authLoaded } = useAuth()
  const { members, isLoading: membersLoading, getMemberName, getMember } = useOrgMembers()

  const [stats, setStats] = useState<{
    leads: { total: number; thisWeek: number }
    calls: { thisWeek: number }
  } | null>(null)
  const [agentBreakdown, setAgentBreakdown] = useState<AgentBreakdownItem[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [unassignedCount, setUnassignedCount] = useState<number>(0)
  const [onboardingStatus, setOnboardingStatus] = useState<Record<string, AgentOnboardingStatus>>({})
  const [slaSummary, setSlaSummary] = useState<SlaSummary | null>(null)
  const [missedFollowUps, setMissedFollowUps] = useState<MissedFollowUpItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // Redirect non-admins once auth loads
  useEffect(() => {
    if (!authLoaded) return
    if (!orgId || orgRole !== "org:admin") {
      router.replace("/leads")
    }
  }, [authLoaded, orgId, orgRole, router])

  // Fetch data
  useEffect(() => {
    if (!authLoaded || !orgId || orgRole !== "org:admin") return

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [statsRes, activityRes, unassignedRes, statusRes, slaRes, missedFuRes] = await Promise.all([
          fetch("/api/dashboard/stats?scope=team"),
          fetch("/api/activity-log/history?scope=team&limit=20"),
          fetch("/api/org/unassigned-count"),
          fetch("/api/org/agent-status"),
          fetch("/api/org/sla-summary"),
          fetch("/api/org/missed-follow-ups"),
        ])

        if (!statsRes.ok || !activityRes.ok || !unassignedRes.ok) {
          throw new Error("Failed to load agency data")
        }

        const [statsData, activityData, unassignedData] = await Promise.all([
          statsRes.json(),
          activityRes.json(),
          unassignedRes.json(),
        ])

        setStats({
          leads: statsData.leads,
          calls: { thisWeek: statsData.calls?.thisWeek ?? 0 },
        })
        setAgentBreakdown(statsData.agentBreakdown ?? [])
        setActivities(activityData.entries ?? [])
        setUnassignedCount(unassignedData.count ?? 0)

        // Onboarding status — non-critical, degrade gracefully
        if (statusRes.ok) {
          const statusData: AgentStatusResponse = await statusRes.json()
          if (statusData.success) {
            setOnboardingStatus(statusData.data)
          }
        }

        // SLA summary — non-critical, degrade gracefully
        if (slaRes.ok) {
          const slaData: SlaSummary = await slaRes.json()
          setSlaSummary(slaData)
        }

        // Missed follow-ups — non-critical, degrade gracefully
        if (missedFuRes.ok) {
          const missedFuData = await missedFuRes.json()
          if (missedFuData.success) {
            setMissedFollowUps(missedFuData.data.items ?? [])
          }
        }
      } catch {
        setError("Unable to load agency data")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [authLoaded, orgId, orgRole])

  // Filtered breakdown when an agent is selected
  const filteredBreakdown = useMemo(() => {
    if (!selectedAgent) return agentBreakdown
    return agentBreakdown.filter((a) => a.agentId === selectedAgent)
  }, [agentBreakdown, selectedAgent])

  const filteredActivities = useMemo(() => {
    if (!selectedAgent) return activities
    return activities.filter((a) => a.agentId === selectedAgent)
  }, [activities, selectedAgent])

  // Overdue follow-up counts per agent (for roster badges)
  const missedCountByAgent = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of missedFollowUps) {
      const key = item.agentId ?? "unassigned"
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [missedFollowUps])

  // Group missed follow-ups by agent for the card
  const missedByAgent = useMemo(() => {
    const map = new Map<string, MissedFollowUpItem[]>()
    for (const item of missedFollowUps) {
      const key = item.agentId ?? "unassigned"
      const existing = map.get(key) ?? []
      map.set(key, [...existing, item])
    }
    return map
  }, [missedFollowUps])

  // Don't render until auth is loaded and confirmed admin
  if (!authLoaded || !orgId || orgRole !== "org:admin") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  const memberCount = Object.keys(members).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agency Overview</h1>
          <p className="text-sm text-muted-foreground">
            Manage your team and track performance
          </p>
        </div>
        {selectedAgent && (
          <button
            type="button"
            onClick={() => setSelectedAgent(null)}
            className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          title="Total Agents"
          value={memberCount}
          icon={Users}
          loading={membersLoading}
        />
        <SummaryCard
          title="Total Leads"
          value={stats?.leads.total ?? 0}
          icon={TrendingUp}
        />
        <SummaryCard
          title="Leads This Week"
          value={stats?.leads.thisWeek ?? 0}
          icon={UserPlus}
        />
        <SummaryCard
          title="Calls This Week"
          value={stats?.calls.thisWeek ?? 0}
          icon={Phone}
        />
      </div>

      {/* Needs Attention — SLA alerts */}
      <NeedsAttentionSection
        slaSummary={slaSummary}
        unassignedCount={unassignedCount}
      />

      {/* Missed Follow-ups Card */}
      {missedFollowUps.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/30 dark:border-orange-900/50 dark:bg-orange-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Missed Follow-ups
              <Badge variant="secondary" className="ml-1 text-[10px] border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300">
                {missedFollowUps.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(missedByAgent.entries()).map(([agentKey, agentLeads]) => {
                const agentName = agentKey === "unassigned"
                  ? "Unassigned"
                  : getMemberName(agentKey) ?? "Unknown Agent"
                const member = agentKey === "unassigned" ? null : getMember(agentKey)

                return (
                  <div key={agentKey}>
                    <div className="mb-2 flex items-center gap-2">
                      {member?.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                          {agentName.charAt(0)}
                        </div>
                      )}
                      <p className="text-[13px] font-semibold text-foreground">
                        {agentName}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {agentLeads.length} missed
                      </span>
                    </div>
                    <div className="space-y-1 pl-7">
                      {agentLeads.slice(0, 5).map((lead) => {
                        const dt = new Date(lead.followUpDate)
                        const dateStr = dt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                        return (
                          <Link
                            key={lead.leadId}
                            href={`/leads/${lead.leadId}`}
                            className="flex items-center justify-between rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/30"
                          >
                            <span className="truncate font-medium text-foreground">
                              {lead.leadName}
                            </span>
                            <span className="shrink-0 ml-3 text-orange-600">
                              Due {dateStr}
                            </span>
                          </Link>
                        )
                      })}
                      {agentLeads.length > 5 && (
                        <p className="px-2 text-[11px] text-muted-foreground">
                          +{agentLeads.length - 5} more
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Roster + Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Agent Roster — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Users className="h-4 w-4 text-[#1773cf]" />
              Agent Roster
              {selectedAgent && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  Filtered
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredBreakdown.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">
                No agents found
              </p>
            ) : (
              <div className="space-y-2">
                {filteredBreakdown.map((agent) => (
                  <AgentRow
                    key={agent.agentId}
                    agent={agent}
                    activities={activities}
                    selected={selectedAgent === agent.agentId}
                    onboarding={onboardingStatus[agent.agentId]}
                    overdueCount={missedCountByAgent[agent.agentId] ?? 0}
                    getMemberName={getMemberName}
                    getMember={getMember}
                    onSelect={() =>
                      setSelectedAgent((prev) =>
                        prev === agent.agentId ? null : agent.agentId,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Team Activity — 1 col */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <Clock className="h-4 w-4 text-[#1773cf]" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredActivities.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    getMemberName={getMemberName}
                    getMember={getMember}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string
  value: number
  icon: typeof Users
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1773cf]/10">
          <Icon className="h-5 w-5 text-[#1773cf]" />
        </div>
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          {loading ? (
            <Loader2 className="mt-1 h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Agent Row                                                          */
/* ------------------------------------------------------------------ */

function AgentRow({
  agent,
  activities,
  selected,
  onboarding,
  overdueCount,
  getMemberName,
  getMember,
  onSelect,
}: {
  agent: AgentBreakdownItem
  activities: ActivityLog[]
  selected: boolean
  onboarding?: AgentOnboardingStatus
  overdueCount: number
  getMemberName: (id: string | null) => string | null
  getMember: (id: string | null) => { firstName: string | null; lastName: string | null; imageUrl: string | null; role: string } | null
  onSelect: () => void
}) {
  const name = getMemberName(agent.agentId) ?? "Unknown Agent"
  const member = getMember(agent.agentId)

  // Determine last active from activity feed
  const lastActivity = activities.find((a) => a.agentId === agent.agentId)
  const activityStatus = getActivityStatus(lastActivity?.createdAt)

  const isFullyOnboarded = onboarding && onboarding.completedCount === onboarding.totalSteps

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full cursor-pointer items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-[#1773cf] bg-[#1773cf]/5"
          : "border-border hover:bg-muted/50"
      }`}
    >
      {/* Avatar */}
      {member?.imageUrl ? (
        <img
          src={member.imageUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-bold text-muted-foreground">
          {name.charAt(0)}
        </div>
      )}

      {/* Name + role + status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-medium">{name}</p>
          {member?.role === "org:admin" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Admin
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`inline-block h-2 w-2 rounded-full ${activityStatus.color}`} />
          <span className="text-[11px] text-muted-foreground">
            {activityStatus.label}
          </span>
        </div>
      </div>

      {/* Onboarding progress */}
      {onboarding && !isFullyOnboarded && (
        <OnboardingBadge onboarding={onboarding} />
      )}

      {/* Overdue follow-up badge */}
      {overdueCount > 0 && (
        <span className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {overdueCount} overdue
        </span>
      )}

      {/* Stats */}
      <div className="hidden items-center gap-6 sm:flex">
        <StatPill label="Leads" value={agent.leadCount} />
        <StatPill label="This Week" value={agent.leadsThisWeek} />
        <StatPill label="Calls" value={agent.callCount} />
        <StatPill label="Quotes" value={agent.quoteCount} />
      </div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Onboarding Badge                                                   */
/* ------------------------------------------------------------------ */

function OnboardingBadge({ onboarding }: { onboarding: AgentOnboardingStatus }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.stopPropagation()
          }}
          className="cursor-pointer shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
        >
          {onboarding.completedCount}/{onboarding.totalSteps} setup
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-2 text-[12px] font-semibold text-foreground">
          Setup Progress
        </p>
        <div className="space-y-1.5">
          {onboarding.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2">
              {step.completed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              )}
              <span
                className={`text-[12px] ${
                  step.completed
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[16px] font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Activity Item                                                      */
/* ------------------------------------------------------------------ */

function ActivityItem({
  activity,
  getMemberName,
  getMember,
}: {
  activity: ActivityLog
  getMemberName: (id: string | null) => string | null
  getMember: (id: string | null) => { firstName: string | null; lastName: string | null; imageUrl: string | null; role: string } | null
}) {
  const config = ACTIVITY_CONFIG[activity.activityType] ?? ACTIVITY_CONFIG.lead_updated
  const Icon = config.icon
  const agentName = getMemberName(activity.agentId)
  const member = getMember(activity.agentId)

  return (
    <div className="flex items-start gap-3">
      {/* Agent avatar */}
      {member?.imageUrl ? (
        <img
          src={member.imageUrl}
          alt=""
          className="mt-0.5 h-6 w-6 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.color}`}>
          <Icon className="h-3 w-3" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-muted-foreground">
          {agentName && (
            <span className="font-medium text-foreground">{agentName} </span>
          )}
          {activity.title}
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Needs Attention Section                                            */
/* ------------------------------------------------------------------ */

function NeedsAttentionSection({
  slaSummary,
  unassignedCount,
}: {
  slaSummary: SlaSummary | null
  unassignedCount: number
}) {
  const items: {
    icon: typeof AlertTriangle
    label: string
    count: number
    severity: "red" | "amber"
    href: string
  }[] = []

  if (slaSummary) {
    if (slaSummary.urgentUnassigned > 0) {
      items.push({
        icon: AlertTriangle,
        label: `lead${slaSummary.urgentUnassigned === 1 ? "" : "s"} unassigned for 30+ min`,
        count: slaSummary.urgentUnassigned,
        severity: "red",
        href: "/leads?filter=unassigned",
      })
    }
    if (slaSummary.staleLeads > 0) {
      items.push({
        icon: Clock,
        label: `lead${slaSummary.staleLeads === 1 ? "" : "s"} with no activity for 24+ hrs`,
        count: slaSummary.staleLeads,
        severity: "amber",
        href: "/leads?scope=team",
      })
    }
    if (slaSummary.missedFollowUps > 0) {
      items.push({
        icon: CalendarX,
        label: `follow-up${slaSummary.missedFollowUps === 1 ? "" : "s"} overdue`,
        count: slaSummary.missedFollowUps,
        severity: "amber",
        href: "/leads?scope=team",
      })
    }
    if (slaSummary.autoReassignedToday > 0) {
      items.push({
        icon: RotateCcw,
        label: `lead${slaSummary.autoReassignedToday === 1 ? "" : "s"} auto-reassigned to pool today`,
        count: slaSummary.autoReassignedToday,
        severity: "amber",
        href: "/leads?filter=unassigned",
      })
    }
  }

  // Fallback: if no SLA data but unassigned leads exist, show the basic banner
  if (items.length === 0 && unassignedCount > 0) {
    items.push({
      icon: UserX,
      label: `unassigned lead${unassignedCount === 1 ? "" : "s"} in the pool`,
      count: unassignedCount,
      severity: "amber",
      href: "/leads?filter=unassigned",
    })
  }

  if (items.length === 0) return null

  const SEVERITY_STYLES = {
    red: {
      border: "border-red-200 dark:border-red-900/50",
      bg: "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50",
      icon: "text-red-600",
      count: "text-red-800 dark:text-red-200",
      label: "text-red-600 dark:text-red-400",
    },
    amber: {
      border: "border-amber-200 dark:border-amber-900/50",
      bg: "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50",
      icon: "text-amber-600",
      count: "text-amber-800 dark:text-amber-200",
      label: "text-amber-600 dark:text-amber-400",
    },
  } as const

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const styles = SEVERITY_STYLES[item.severity]
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${styles.border} ${styles.bg}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} />
              <span className={`font-semibold tabular-nums ${styles.count}`}>
                {item.count}
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getActivityStatus(lastActivityDate: string | undefined): {
  color: string
  label: string
} {
  if (!lastActivityDate) {
    return { color: "bg-gray-400", label: "No activity" }
  }

  const now = Date.now()
  const lastActive = new Date(lastActivityDate).getTime()
  const diffMs = now - lastActive
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays < 1) {
    return { color: "bg-green-500", label: "Active today" }
  }
  if (diffDays < 3) {
    return { color: "bg-amber-500", label: "Active this week" }
  }
  return { color: "bg-red-500", label: `Inactive ${Math.floor(diffDays)}d` }
}
