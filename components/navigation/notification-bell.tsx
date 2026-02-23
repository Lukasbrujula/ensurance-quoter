"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  BellOff,
  Bot,
  Clock,
  Phone,
  ArrowRight,
  Zap,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Notification, NotificationType, NotificationsResponse } from "@/lib/supabase/notifications"

/* ------------------------------------------------------------------ */
/*  Notification type config                                           */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  ai_agent_lead: { icon: Bot, color: "text-violet-600", bg: "bg-violet-50" },
  overdue_followup: { icon: Clock, color: "text-red-500", bg: "bg-red-50" },
  upcoming_callback: { icon: Phone, color: "text-green-600", bg: "bg-green-50" },
  status_change: { icon: ArrowRight, color: "text-blue-600", bg: "bg-blue-50" },
  call: { icon: Phone, color: "text-violet-600", bg: "bg-violet-50" },
  quote: { icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
}

/* ------------------------------------------------------------------ */
/*  Date grouping                                                      */
/* ------------------------------------------------------------------ */

function groupByDate(notifications: Notification[]): Record<string, Notification[]> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const groups: Record<string, Notification[]> = {}

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    let label: string
    if (dayStart >= today) label = "Today"
    else if (dayStart >= yesterday) label = "Yesterday"
    else label = "Earlier"

    const existing = groups[label] ?? []
    groups[label] = [...existing, n]
  }

  return groups
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationsResponse | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const json: NotificationsResponse = await res.json()
      setData(json)
    } catch {
      // Silent fail for polling
    }
  }, [])

  // Initial load
  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  // Poll every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", { method: "POST" })
      setData((prev) =>
        prev
          ? {
              ...prev,
              unreadCount: 0,
              notifications: prev.notifications.map((n) => ({ ...n, read: true })),
            }
          : prev,
      )
    } catch {
      // Silent fail
    }
  }, [])

  const handleClick = useCallback(
    (notification: Notification) => {
      if (notification.leadId) {
        router.push(`/leads/${notification.leadId}`)
      }
      setOpen(false)
    },
    [router],
  )

  const unreadCount = data?.unreadCount ?? 0
  const grouped = data ? groupByDate(data.notifications) : {}
  const groupOrder = ["Today", "Yesterday", "Earlier"]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-7 w-7 items-center justify-center rounded-sm text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[440px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] text-muted-foreground"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </SheetHeader>

          {!data || data.notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <BellOff className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No notifications</p>
              <p className="text-xs">You&apos;re all caught up</p>
            </div>
          ) : (
            <ScrollArea className="mt-4 h-[calc(100vh-120px)]">
              {groupOrder.map((label) => {
                const items = grouped[label]
                if (!items || items.length === 0) return null
                return (
                  <div key={label} className="mb-4">
                    <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {label}
                    </p>
                    {items.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onClick={() => handleClick(notification)}
                      />
                    ))}
                  </div>
                )
              })}
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Notification item                                                  */
/* ------------------------------------------------------------------ */

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification
  onClick: () => void
}) {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.call
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted/50",
        !notification.read && "bg-muted/30",
      )}
    >
      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", config.bg)}>
        <Icon className={cn("h-3.5 w-3.5", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px]", !notification.read && "font-medium")}>
          {notification.message}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#1773cf]" />
      )}
    </button>
  )
}
