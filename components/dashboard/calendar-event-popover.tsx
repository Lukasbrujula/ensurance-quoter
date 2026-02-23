"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Clock, ExternalLink, Trash2, User } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { updateLeadFields } from "@/lib/actions/leads"
import type { CalendarEvent } from "./calendar-event-item"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CalendarEventPopoverProps {
  event: CalendarEvent
  children: React.ReactNode
  /** Called after an event is deleted/cancelled */
  onEventDeleted?: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CalendarEventPopover({
  event,
  children,
  onEventDeleted,
}: CalendarEventPopoverProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const startTime = new Date(event.startTime)
  const dateStr = format(startTime, "EEE, MMM d")
  const timeStr = format(startTime, "h:mm a")

  const isEnsuranceEvent = event.type !== "external"
  const canDelete = isEnsuranceEvent && !!event.leadId

  function handleCancel() {
    if (!event.leadId) return

    startTransition(async () => {
      const result = await updateLeadFields(event.leadId!, {
        followUpDate: null,
        followUpNote: null,
      })
      if (result.success) {
        setOpen(false)
        onEventDeleted?.()
      } else {
        toast.error(result.error ?? "Failed to cancel follow-up")
      }
    })
  }

  function handleViewLead() {
    if (event.leadId) {
      router.push(`/leads/${event.leadId}`)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="right">
        <div className="p-3 space-y-3">
          {/* Title */}
          <div>
            <h4 className="text-sm font-semibold leading-tight">{event.title}</h4>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{dateStr} at {timeStr}</span>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {event.type === "follow_up"
                ? "Follow-up"
                : event.type === "ai_callback"
                  ? "AI Callback"
                  : "Google Calendar"}
            </Badge>
            {event.source === "both" && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700"
              >
                Synced
              </Badge>
            )}
          </div>

          {/* Note */}
          {event.note && (
            <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
              {event.note}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t">
            {isEnsuranceEvent && event.leadId && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-7"
                onClick={handleViewLead}
              >
                <User className="mr-1 h-3 w-3" />
                View Lead
              </Button>
            )}
            {event.type === "external" && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-7"
                asChild
              >
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open in Google
                </a>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs h-7"
                onClick={handleCancel}
                disabled={isPending}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {isPending ? "Removing..." : "Cancel"}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
