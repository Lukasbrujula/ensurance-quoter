"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  BellOff,
  Bot,
  Clock,
  Phone,
  ArrowRight,
  Zap,
  GripVertical,
  X,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
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
/*  Resizable panel constants                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_WIDTH = 420
const MIN_WIDTH = 320
const MAX_WIDTH_RATIO = 0.85

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)

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

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  // Drag-to-resize logic
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartX.current = e.clientX
      dragStartWidth.current = panelWidth
    },
    [panelWidth],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO
      const newWidth = Math.min(Math.max(dragStartWidth.current + delta, MIN_WIDTH), maxWidth)
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

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

      {/* Resizable notification panel overlay */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className={cn(
              "fixed inset-0 z-50 bg-black/50",
              isDragging ? "cursor-col-resize" : "",
            )}
            onClick={isDragging ? undefined : () => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel container */}
          <div
            ref={panelRef}
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex",
              isDragging ? "select-none" : "",
            )}
            style={{ width: panelWidth }}
            role="dialog"
            aria-label="Notifications"
          >
            {/* Drag handle — left edge */}
            <div
              onMouseDown={handleDragStart}
              className={cn(
                "flex w-[10px] shrink-0 cursor-col-resize items-center justify-center transition-colors",
                isDragging ? "bg-[#1773cf]/20" : "hover:bg-[#e2e8f0]",
              )}
            >
              <div className="flex h-8 w-[6px] items-center justify-center rounded-sm border border-[#cbd5e1] bg-white shadow-sm">
                <GripVertical className="h-3 w-3 text-[#94a3b8]" />
              </div>
            </div>

            {/* Panel content */}
            <div className="flex flex-1 flex-col overflow-hidden border-l border-[#e2e8f0] bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#e2e8f0] px-4 py-3">
                <h2 className="text-base font-semibold text-foreground">Notifications</h2>
                <div className="flex items-center gap-2">
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
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-sm p-1 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              {!data || data.notifications.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center text-muted-foreground">
                  <BellOff className="mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">No notifications</p>
                  <p className="text-xs">You&apos;re all caught up</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-4 py-3">
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
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </>
      )}
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
