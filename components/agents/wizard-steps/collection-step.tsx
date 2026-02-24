"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronDown, Calendar, Check, ExternalLink, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BusinessHoursEditor } from "@/components/agents/business-hours-editor"
import type {
  CollectFieldId,
  PostCallActionId,
  BusinessHours,
} from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Field & Action definitions                                         */
/* ------------------------------------------------------------------ */

interface FieldOption {
  id: CollectFieldId
  label: string
  description: string
  locked?: boolean
}

const COLLECT_FIELD_OPTIONS: readonly FieldOption[] = [
  { id: "name", label: "Caller's full name", description: "Always collected", locked: true },
  { id: "phone", label: "Phone number", description: "Callback number", locked: true },
  { id: "reason", label: "Reason for calling", description: "Brief topic", locked: true },
  { id: "callback_time", label: "Preferred callback time", description: "When to call back" },
  { id: "email", label: "Email address", description: "For follow-up emails" },
  { id: "date_of_birth", label: "Date of birth", description: "Age qualification" },
  { id: "state", label: "State of residence", description: "For state eligibility" },
] as const

interface ActionOption {
  id: PostCallActionId
  label: string
  description: string
}

const POST_CALL_ACTION_OPTIONS: readonly ActionOption[] = [
  { id: "save_lead", label: "Save caller as a lead", description: "Creates or updates a lead record" },
  { id: "book_calendar", label: "Book callback on calendar", description: "Adds event to your Google Calendar" },
  { id: "send_notification", label: "Send notification", description: "Notification bell alert" },
] as const

/* ------------------------------------------------------------------ */
/*  Google Calendar status                                             */
/* ------------------------------------------------------------------ */

interface GoogleStatus {
  connected: boolean
  email: string | null
  configured: boolean
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CollectionStepProps {
  collectFields: CollectFieldId[]
  postCallActions: PostCallActionId[]
  businessHours: BusinessHours | null
  afterHoursGreeting: string
  onToggleCollectField: (id: CollectFieldId) => void
  onTogglePostCallAction: (id: PostCallActionId) => void
  onBusinessHoursChange: (hours: BusinessHours | null) => void
  onAfterHoursGreetingChange: (greeting: string) => void
  showBusinessHoursExpanded?: boolean
  /** Current template ID — used to show template-specific UI */
  templateId?: string | null
  /** Called when user clicks "Connect Calendar" — saves wizard state and redirects */
  onConnectCalendar?: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CollectionStep({
  collectFields,
  postCallActions,
  businessHours,
  afterHoursGreeting,
  onToggleCollectField,
  onTogglePostCallAction,
  onBusinessHoursChange,
  onAfterHoursGreetingChange,
  showBusinessHoursExpanded = false,
  templateId,
  onConnectCalendar,
}: CollectionStepProps) {
  const [hoursExpanded, setHoursExpanded] = useState(
    showBusinessHoursExpanded || businessHours !== null,
  )

  const isScheduler = templateId === "appointment-scheduler"

  // Fetch Google Calendar connection status
  const [calendarStatus, setCalendarStatus] = useState<GoogleStatus | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(true)

  const fetchCalendarStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status")
      if (!res.ok) {
        setCalendarStatus({ connected: false, email: null, configured: false })
        return
      }
      const data: GoogleStatus = await res.json()
      setCalendarStatus(data)
    } catch {
      setCalendarStatus({ connected: false, email: null, configured: false })
    } finally {
      setCalendarLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCalendarStatus()
  }, [fetchCalendarStatus])

  const calendarConnected = calendarStatus?.connected ?? false
  const calendarConfigured = calendarStatus?.configured ?? false
  const bookCalendarEnabled = postCallActions.includes("book_calendar")

  return (
    <div className="space-y-5">
      {/* Calendar connection banner — shown when not connected */}
      {!calendarLoading && !calendarConnected && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
                Connect Google Calendar
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                {isScheduler
                  ? "Your scheduling agent needs calendar access to book appointments automatically."
                  : "Connect your calendar so the agent can book callbacks automatically."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-7 gap-1.5 text-[12px] border-amber-300 dark:border-amber-700"
                disabled={!calendarConfigured}
                onClick={() => onConnectCalendar?.()}
                title={
                  calendarConfigured
                    ? "Connect your Google Calendar"
                    : "Google Calendar not configured on this server"
                }
              >
                <Calendar className="h-3 w-3" />
                Connect Calendar
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {!calendarLoading && calendarConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950/30">
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <p className="text-[12px] text-green-700 dark:text-green-300">
            Google Calendar connected{calendarStatus?.email ? ` as ${calendarStatus.email}` : ""}
          </p>
        </div>
      )}

      {/* Information to collect */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Information to collect</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isScheduler
              ? "What info does your agent need to schedule an appointment?"
              : "What data should the AI gather from callers?"}
          </p>
        </div>
        <div className="space-y-1.5">
          {COLLECT_FIELD_OPTIONS.map((field) => {
            const checked = collectFields.includes(field.id)
            return (
              <label
                key={field.id}
                className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => {
                    if (!field.locked) onToggleCollectField(field.id)
                  }}
                  disabled={field.locked}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px]">{field.label}</span>
                  {field.locked && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      (required)
                    </span>
                  )}
                  <p className="text-[11px] text-muted-foreground">{field.description}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* After the call */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">After the call</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What happens automatically when a call ends?
          </p>
        </div>
        <div className="space-y-1.5">
          {POST_CALL_ACTION_OPTIONS.map((action) => {
            const checked = postCallActions.includes(action.id)
            const isCalendarAction = action.id === "book_calendar"
            return (
              <label
                key={action.id}
                className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onTogglePostCallAction(action.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px]">{action.label}</span>
                    {isCalendarAction && !calendarLoading && calendarConnected && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-2.5 w-2.5" />
                        Connected
                      </span>
                    )}
                    {isCalendarAction && !calendarLoading && !calendarConnected && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Not connected
                      </span>
                    )}
                    {isCalendarAction && calendarLoading && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{action.description}</p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Business hours — collapsible */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setHoursExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        >
          <div>
            <p className="text-[13px] font-medium">Business Hours</p>
            <p className="text-[11px] text-muted-foreground">
              Optional. The AI will share hours when asked.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              hoursExpanded && "rotate-180",
            )}
          />
        </button>
        {hoursExpanded && (
          <div className="border-t px-3 py-3">
            <BusinessHoursEditor
              hours={businessHours}
              afterHoursGreeting={afterHoursGreeting}
              onHoursChange={onBusinessHoursChange}
              onAfterHoursGreetingChange={onAfterHoursGreetingChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
