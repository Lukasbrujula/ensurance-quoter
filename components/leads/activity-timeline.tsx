"use client"

import { useEffect, useState, useCallback } from "react"
import {
  UserPlus,
  ArrowRight,
  Phone,
  Calculator,
  Search,
  Clock,
  MessageSquare,
  Pencil,
  Mail,
  Loader2,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ActivityLog, ActivityType } from "@/lib/types/activity"

/* ------------------------------------------------------------------ */
/*  Activity type config                                               */
/* ------------------------------------------------------------------ */

interface ActivityTypeConfig {
  icon: React.ComponentType<{ className?: string }>
  color: string
  dotColor: string
}

const ACTIVITY_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  lead_created: {
    icon: UserPlus,
    color: "text-green-600",
    dotColor: "bg-green-500",
  },
  status_change: {
    icon: ArrowRight,
    color: "text-blue-600",
    dotColor: "bg-blue-500",
  },
  call: {
    icon: Phone,
    color: "text-purple-600",
    dotColor: "bg-purple-500",
  },
  quote: {
    icon: Calculator,
    color: "text-amber-600",
    dotColor: "bg-amber-500",
  },
  enrichment: {
    icon: Search,
    color: "text-teal-600",
    dotColor: "bg-teal-500",
  },
  follow_up: {
    icon: Clock,
    color: "text-orange-600",
    dotColor: "bg-orange-500",
  },
  note: {
    icon: MessageSquare,
    color: "text-slate-600",
    dotColor: "bg-slate-500",
  },
  lead_updated: {
    icon: Pencil,
    color: "text-gray-600",
    dotColor: "bg-gray-400",
  },
  email_sent: {
    icon: Mail,
    color: "text-indigo-600",
    dotColor: "bg-indigo-500",
  },
  sms_sent: {
    icon: MessageSquare,
    color: "text-teal-600",
    dotColor: "bg-teal-500",
  },
  sms_received: {
    icon: MessageSquare,
    color: "text-emerald-600",
    dotColor: "bg-emerald-500",
  },
}

/* ------------------------------------------------------------------ */
/*  Relative timestamp                                                 */
/* ------------------------------------------------------------------ */

function relativeTime(isoDate: string): string {
  const now = new Date()
  const then = new Date(isoDate)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return "Just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays === 1) {
    return `Yesterday at ${then.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
  }
  if (diffDays < 7) return `${diffDays}d ago`

  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: now.getFullYear() !== then.getFullYear() ? "numeric" : undefined,
  })
}

/* ------------------------------------------------------------------ */
/*  Detail renderer                                                    */
/* ------------------------------------------------------------------ */

function ActivityDetails({
  activity,
  onCallClick,
}: {
  activity: ActivityLog
  onCallClick?: (activity: ActivityLog) => void
}) {
  const details = activity.details
  if (!details) return null

  switch (activity.activityType) {
    case "status_change":
      return (
        <span className="text-[11px] text-[#64748b]">
          {String(details.from ?? "—")} → {String(details.to ?? "—")}
        </span>
      )

    case "call":
      return (
        <span className="text-[11px] text-[#64748b]">
          {details.handled_by === "ai_agent" ? "AI agent · " : ""}
          {String(details.direction ?? "outbound")}
          {details.duration_seconds != null && ` · ${formatCallDuration(Number(details.duration_seconds))}`}
          {details.has_transcript ? (
            onCallClick ? (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => onCallClick(activity)}
                  className="font-medium text-[#1773cf] underline-offset-2 hover:underline"
                >
                  view transcript
                </button>
              </>
            ) : (
              " · transcript"
            )
          ) : ""}
        </span>
      )

    case "quote":
      return (
        <span className="text-[11px] text-[#64748b]">
          {details.carrier_count != null ? `${String(details.carrier_count)} carriers` : ""}
          {details.top_carrier ? ` · top: ${String(details.top_carrier)}` : ""}
          {details.coverage ? ` · ${String(details.coverage)}` : ""}
          {details.term ? ` / ${String(details.term)}` : ""}
        </span>
      )

    case "enrichment":
      if (Array.isArray(details.fields_updated) && details.fields_updated.length > 0) {
        return (
          <span className="text-[11px] text-[#64748b]">
            Updated: {(details.fields_updated as string[]).join(", ")}
          </span>
        )
      }
      return null

    case "follow_up":
      return (
        <span className="text-[11px] text-[#64748b]">
          {details.date
            ? new Date(String(details.date)).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : ""}
          {details.note ? ` — ${String(details.note)}` : ""}
        </span>
      )

    case "note":
      if (details.text) {
        const text = String(details.text)
        return (
          <span className="text-[11px] text-[#64748b] italic">
            {text.length > 100 ? `${text.slice(0, 100)}...` : text}
          </span>
        )
      }
      return null

    case "lead_updated":
      if (Array.isArray(details.fields_changed) && details.fields_changed.length > 0) {
        return (
          <span className="text-[11px] text-[#64748b]">
            Changed: {(details.fields_changed as string[]).join(", ")}
          </span>
        )
      }
      return null

    case "lead_created":
      return (
        <span className="text-[11px] text-[#64748b]">
          Source: {String(details.source ?? "unknown")}
        </span>
      )

    case "email_sent":
      return (
        <span className="text-[11px] text-[#64748b]">
          {details.recipient ? `To: ${String(details.recipient)}` : ""}
          {details.subject ? ` — ${String(details.subject)}` : ""}
        </span>
      )

    case "sms_sent":
      return (
        <span className="text-[11px] text-[#64748b]">
          {details.direction ? `${String(details.direction)} · ` : ""}
          {details.to ? `${String(details.to)} · ` : ""}
          {details.message_preview ? String(details.message_preview) : ""}
        </span>
      )

    default:
      return null
  }
}

function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/* ------------------------------------------------------------------ */
/*  Timeline entry                                                     */
/* ------------------------------------------------------------------ */

function TimelineEntry({
  activity,
  isLast,
  onCallClick,
}: {
  activity: ActivityLog
  isLast: boolean
  onCallClick?: (activity: ActivityLog) => void
}) {
  const config = ACTIVITY_CONFIG[activity.activityType] ?? ACTIVITY_CONFIG.lead_updated
  const Icon = config.icon

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[9px] top-5 bottom-0 w-px bg-[#e2e8f0]" />
      )}

      {/* Dot */}
      <div
        className={`relative z-10 mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full ${config.dotColor} flex items-center justify-center`}
      >
        <Icon className="h-2.5 w-2.5 text-white" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#0f172a] leading-tight">
            {activity.title}
          </span>
          <span className="shrink-0 text-[10px] text-[#94a3b8]">
            {relativeTime(activity.createdAt)}
          </span>
        </div>
        <ActivityDetails activity={activity} onCallClick={onCallClick} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Activity Timeline                                                  */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20

export function ActivityTimeline({
  leadId,
  onCallClick,
}: {
  leadId: string
  onCallClick?: (activity: ActivityLog) => void
}) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchActivities = useCallback(
    async (offset: number, append: boolean) => {
      try {
        const res = await fetch(
          `/api/activity-log/${leadId}?limit=${PAGE_SIZE}&offset=${offset}`,
        )
        if (!res.ok) return

        const data = (await res.json()) as {
          activities: ActivityLog[]
          total: number
        }

        setActivities((prev) =>
          append ? [...prev, ...data.activities] : data.activities,
        )
        setTotal(data.total)
      } catch {
        // Non-critical — timeline just won't load
      }
    },
    [leadId],
  )

  useEffect(() => {
    setIsLoading(true)
    void fetchActivities(0, false).finally(() => setIsLoading(false))
  }, [fetchActivities])

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true)
    await fetchActivities(activities.length, true)
    setIsLoadingMore(false)
  }, [fetchActivities, activities.length])

  const hasMore = activities.length < total

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#94a3b8]" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-[11px] text-[#94a3b8]">
        No activity yet
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="pl-1">
        {activities.map((activity, idx) => (
          <TimelineEntry
            key={activity.id}
            activity={activity}
            isLast={idx === activities.length - 1}
            onCallClick={onCallClick}
          />
        ))}
      </div>

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLoadMore}
          disabled={isLoadingMore}
          className="mx-auto text-[11px] text-[#64748b]"
        >
          {isLoadingMore ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <ChevronDown className="mr-1 h-3 w-3" />
          )}
          Load more ({total - activities.length} remaining)
        </Button>
      )}
    </div>
  )
}
