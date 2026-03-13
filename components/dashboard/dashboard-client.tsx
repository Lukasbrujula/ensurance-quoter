"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import {
  Users,
  Phone,
  TrendingUp,
  Zap,
  UserPlus,
  Clock,
  ArrowRight,
  Calendar,
  Mail,
  MessageSquare,
  Settings2,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUser } from "@clerk/nextjs"
import { getFollowUpUrgency } from "@/components/leads/follow-up-scheduler"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { BusinessProfileCard } from "@/components/dashboard/business-profile-card"
import { DashboardGoals } from "@/components/dashboard/dashboard-goals"
import { SortableWidget } from "@/components/dashboard/sortable-widget"
import { WidgetPickerSheet } from "@/components/dashboard/widget-picker-sheet"
import { InboxUnreadWidget } from "@/components/dashboard/inbox-unread-widget"
import { AvgResponseTimeWidget } from "@/components/dashboard/avg-response-time-widget"
import { CommunicationBreakdownWidget } from "@/components/dashboard/communication-breakdown-widget"
import { AiAgentSummaryWidget } from "@/components/dashboard/ai-agent-summary-widget"
import { AiCallQueueWidget } from "@/components/dashboard/ai-call-queue-widget"
import { CommissionEstimateWidget } from "@/components/dashboard/commission-estimate-widget"
import { TopCarriersWidget } from "@/components/dashboard/top-carriers-widget"
import { CalendarPreviewWidget } from "@/components/dashboard/calendar-preview-widget"
import { UsageCostsWidget } from "@/components/dashboard/usage-costs-widget"
import { useDashboardLayout } from "@/hooks/use-dashboard-layout"
import { WIDGET_MAP, WIDGET_SIZE_SPANS } from "@/lib/data/dashboard-widgets"
import { PIPELINE_STAGES } from "@/lib/data/pipeline"
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
  email_sent: { icon: Mail, color: "text-indigo-600 bg-indigo-50" },
  sms_sent: { icon: MessageSquare, color: "text-teal-600 bg-teal-50" },
  sms_received: { icon: MessageSquare, color: "text-emerald-600 bg-emerald-50" },
}

/* ------------------------------------------------------------------ */
/*  Widget renderer                                                    */
/* ------------------------------------------------------------------ */

function renderWidget(id: string, stats: DashboardStats) {
  switch (id) {
    case "stat-leads":
      return <StatCardContent title="Total Leads" value={stats.leads.total} subtitle={`${stats.leads.thisWeek} this week`} icon={Users} href="/leads" />
    case "stat-calls":
      return <StatCardContent title="Calls This Week" value={stats.calls.thisWeek} subtitle={`${stats.calls.thisMonth} this month`} icon={Phone} href="/calendar" />
    case "stat-close-rate":
      return <StatCardContent title="Close Rate" value={`${stats.closeRate}%`} subtitle="Quoted to issued" icon={TrendingUp} href="/pipeline" />
    case "stat-active-deals":
      return (
        <StatCardContent
          title="Active Deals"
          value={
            (stats.leads.byStatus["contacted"] ?? 0) +
            (stats.leads.byStatus["quoted"] ?? 0) +
            (stats.leads.byStatus["applied"] ?? 0)
          }
          subtitle="Active opportunities"
          icon={Zap}
          href="/pipeline"
        />
      )
    case "business-profile":
      return <BusinessProfileCard />
    case "pipeline":
      return <PipelineBar byStatus={stats.leads.byStatus} />
    case "charts":
      return <DashboardCharts byStatus={stats.leads.byStatus} />
    case "goals":
      return <DashboardGoals />
    case "activity":
      return <ActivityWidget stats={stats} />
    case "follow-ups":
      return <FollowUpsWidget stats={stats} />
    case "quote-to-app-rate":
      return <QuoteToAppRateCard byStatus={stats.leads.byStatus} />
    case "communication-breakdown":
      return <CommunicationBreakdownWidget />
    case "inbox-unread":
      return <InboxUnreadWidget />
    case "avg-response-time":
      return <AvgResponseTimeWidget />
    case "ai-agent-summary":
      return <AiAgentSummaryWidget />
    case "ai-call-queue":
      return <AiCallQueueWidget />
    case "commission-estimate":
      return <CommissionEstimateWidget byStatus={stats.leads.byStatus} />
    case "top-carriers":
      return <TopCarriersWidget />
    case "usage-costs":
      return <UsageCostsWidget />
    case "calendar-preview":
      return <CalendarPreviewWidget />
    case "overdue-tasks":
      return <OverdueTasksCard stats={stats} />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DashboardClient() {
  const { user } = useUser()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const {
    widgetOrder,
    layout,
    reorder,
    toggleWidget,
    resetToDefault,
    loaded: layoutLoaded,
  } = useDashboardLayout()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  )

  const firstName =
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = widgetOrder.indexOf(String(active.id))
    const newIndex = widgetOrder.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    reorder(arrayMove(widgetOrder, oldIndex, newIndex))
  }

  if (loading || !layoutLoaded) {
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Customize
          </Button>
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

      {/* Sortable Widget Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgetOrder}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {widgetOrder.map((widgetId) => {
              const def = WIDGET_MAP.get(widgetId)
              const span = def
                ? WIDGET_SIZE_SPANS[def.size]
                : "col-span-1"
              return (
                <SortableWidget
                  key={widgetId}
                  id={widgetId}
                  label={def?.name ?? widgetId}
                  className={span}
                >
                  {renderWidget(widgetId, stats)}
                </SortableWidget>
              )
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="rounded-lg bg-background shadow-xl ring-1 ring-border/50">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {WIDGET_MAP.get(activeId)?.name ?? activeId}
              </div>
              <div className="p-4">
                {renderWidget(activeId, stats)}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Widget Picker Sheet */}
      <WidgetPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        activeWidgetIds={layout.active}
        onToggle={toggleWidget}
        onReset={resetToDefault}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Widget components                                                  */
/* ------------------------------------------------------------------ */

function StatCardContent({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: typeof Users
  href: string
}) {
  const router = useRouter()

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(href)}
    >
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

function ActivityWidget({ stats }: { stats: DashboardStats }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <TrendingUp className="h-4 w-4 text-[#1773cf]" />
            Recent Activity
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
            <Link href="/history">View All Activity</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stats.recentActivity.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">
              No activity yet — start by getting a quote or adding a lead.
            </p>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="default">
                <Link href="/quote">
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                  New Quote
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/leads">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add a Lead
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-480px)] min-h-[160px]">
            <div className="space-y-1">
              {stats.recentActivity.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function FollowUpsWidget({ stats }: { stats: DashboardStats }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Calendar className="h-4 w-4 text-[#1773cf]" />
          Upcoming Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats.upcomingFollowUps.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">
              No pending follow-ups
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/leads">
                <Users className="mr-1.5 h-3.5 w-3.5" />
                View Leads
              </Link>
            </Button>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-480px)] min-h-[160px]">
            <div className="space-y-1">
              {stats.upcomingFollowUps.map((fu) => (
                <FollowUpRow key={fu.leadId} item={fu} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function PipelineBar({ byStatus }: { byStatus: Record<string, number> }) {
  const router = useRouter()
  const activePipeline = PIPELINE_STAGES.filter((s) => s.value !== "dead" && s.value !== "issued")
  const total = activePipeline.reduce((sum, s) => sum + (byStatus[s.value] ?? 0), 0)

  if (total === 0) return null

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push("/pipeline")}
    >
      <CardContent className="py-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Pipeline Distribution
          </p>
          <p className="text-[11px] text-muted-foreground">{total} active leads</p>
        </div>
        <div className="flex h-6 overflow-hidden rounded-full">
          {activePipeline.map((stage) => {
            const count = byStatus[stage.value] ?? 0
            if (count === 0) return null
            const pct = (count / total) * 100
            const bgColor = stage.value === "new"
              ? "bg-blue-400"
              : stage.value === "contacted"
                ? "bg-yellow-400"
                : stage.value === "quoted"
                  ? "bg-purple-400"
                  : "bg-orange-400"
            return (
              <div
                key={stage.value}
                className={`flex items-center justify-center text-[10px] font-bold text-white ${bgColor}`}
                style={{ width: `${Math.max(pct, 8)}%` }}
                title={`${stage.label}: ${count}`}
              >
                {count}
              </div>
            )
          })}
        </div>
        <div className="mt-1.5 flex gap-4">
          {activePipeline.map((stage) => {
            const count = byStatus[stage.value] ?? 0
            if (count === 0) return null
            const dotColor = stage.value === "new"
              ? "bg-blue-400"
              : stage.value === "contacted"
                ? "bg-yellow-400"
                : stage.value === "quoted"
                  ? "bg-purple-400"
                  : "bg-orange-400"
            return (
              <span key={stage.value} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                {stage.label} ({count})
              </span>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function QuoteToAppRateCard({ byStatus }: { byStatus: Record<string, number> }) {
  const quoted = byStatus["quoted"] ?? 0
  const applied = byStatus["applied"] ?? 0
  const issued = byStatus["issued"] ?? 0
  const denominator = quoted + applied + issued
  const rate = denominator > 0
    ? Math.round(((applied + issued) / denominator) * 100)
    : 0

  return (
    <StatCardContent
      title="Quote-to-App"
      value={`${rate}%`}
      subtitle={`${applied + issued} of ${denominator} quoted`}
      icon={TrendingUp}
      href="/pipeline"
    />
  )
}

function OverdueTasksCard({ stats }: { stats: DashboardStats }) {
  const now = new Date()
  const overdue = stats.upcomingFollowUps.filter(
    (fu) => new Date(fu.followUpDate) < now,
  )

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Clock className="h-4 w-4 text-red-500" />
          Overdue Tasks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {overdue.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">
              No overdue follow-ups — you&apos;re on top of it!
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[200px] min-h-[80px]">
            <div className="space-y-1">
              {overdue.slice(0, 10).map((fu) => (
                <FollowUpRow key={fu.leadId} item={fu} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}


/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

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

function FollowUpRow({ item }: { item: FollowUpItem }) {
  const urgency = getFollowUpUrgency(item.followUpDate)
  const fu = new Date(item.followUpDate)
  const dateStr = format(fu, "MMM d")
  const timeStr = format(fu, "h:mm a")

  const urgencyColor =
    urgency === "overdue"
      ? "text-red-500"
      : urgency === "today"
        ? "text-amber-500"
        : "text-blue-500"

  const urgencyLabel =
    urgency === "overdue" ? "Overdue" : urgency === "today" ? "Today" : dateStr

  return (
    <Link
      href={`/leads/${item.leadId}`}
      className="flex items-start gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50"
    >
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        urgency === "overdue" ? "bg-red-50" : urgency === "today" ? "bg-amber-50" : "bg-blue-50"
      }`}>
        <Clock className={`h-3.5 w-3.5 ${urgencyColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[13px] font-medium">{item.leadName}</p>
        <p className={`text-[11px] font-medium ${urgencyColor}`}>
          {urgencyLabel} at {timeStr}
        </p>
        {item.followUpNote && (
          <p className="truncate text-[11px] text-muted-foreground">{item.followUpNote}</p>
        )}
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
