"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  { id: "book_calendar", label: "Book callback on calendar", description: "Requires Google Calendar connected" },
  { id: "send_notification", label: "Send notification", description: "Notification bell alert" },
] as const

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
}: CollectionStepProps) {
  const [hoursExpanded, setHoursExpanded] = useState(
    showBusinessHoursExpanded || businessHours !== null,
  )

  return (
    <div className="space-y-5">
      {/* Information to collect */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Information to collect</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What data should the AI gather from callers?
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
                  <span className="text-[13px]">{action.label}</span>
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
