"use client"

import { useState, useCallback } from "react"
import { CalendarClock, Clock } from "lucide-react"
import { format, addHours, addDays, nextMonday, nextFriday } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FollowUpScheduler, getFollowUpUrgency } from "./follow-up-scheduler"

/* ------------------------------------------------------------------ */
/*  Quick presets                                                       */
/* ------------------------------------------------------------------ */

interface Preset {
  label: string
  getDate: () => Date
}

function getPresets(): Preset[] {
  const now = new Date()
  return [
    {
      label: "In 1 hour",
      getDate: () => addHours(now, 1),
    },
    {
      label: "Tomorrow 9:00 AM",
      getDate: () => {
        const d = addDays(now, 1)
        d.setHours(9, 0, 0, 0)
        return d
      },
    },
    {
      label: "Tomorrow 2:00 PM",
      getDate: () => {
        const d = addDays(now, 1)
        d.setHours(14, 0, 0, 0)
        return d
      },
    },
    {
      label: "Next Monday 9:00 AM",
      getDate: () => {
        const d = nextMonday(now)
        d.setHours(9, 0, 0, 0)
        return d
      },
    },
    {
      label: "Next Friday 9:00 AM",
      getDate: () => {
        const d = nextFriday(now)
        d.setHours(9, 0, 0, 0)
        return d
      },
    },
  ]
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FollowUpPickerProps {
  followUpDate: string | null
  followUpNote: string | null
  onSave: (date: string, note: string | null) => void
  onClear: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FollowUpPicker({
  followUpDate,
  followUpNote,
  onSave,
  onClear,
}: FollowUpPickerProps) {
  const [open, setOpen] = useState(false)
  const [showCustom, setShowCustom] = useState(false)

  const urgency = getFollowUpUrgency(followUpDate)

  const handlePresetClick = useCallback(
    (preset: Preset) => {
      onSave(preset.getDate().toISOString(), null)
      setOpen(false)
      setShowCustom(false)
    },
    [onSave],
  )

  const handleCustomSave = useCallback(
    (date: string, note: string | null) => {
      onSave(date, note)
      setOpen(false)
      setShowCustom(false)
    },
    [onSave],
  )

  const handleClear = useCallback(() => {
    onClear()
    setOpen(false)
    setShowCustom(false)
  }, [onClear])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) setShowCustom(false)
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          {urgency === "none" ? (
            <>
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Set follow-up</span>
            </>
          ) : (
            <>
              <Clock
                className={`h-3.5 w-3.5 ${
                  urgency === "overdue"
                    ? "text-red-500"
                    : urgency === "today"
                      ? "text-amber-500"
                      : "text-blue-500"
                }`}
              />
              <span
                className={
                  urgency === "overdue"
                    ? "text-red-600"
                    : urgency === "today"
                      ? "text-amber-600"
                      : "text-foreground"
                }
              >
                {urgency === "overdue"
                  ? `Overdue: ${format(new Date(followUpDate!), "MMM d")}`
                  : `Follow up: ${format(new Date(followUpDate!), "MMM d 'at' h:mm a")}`}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {showCustom ? (
          <div className="p-3">
            <FollowUpScheduler
              followUpDate={followUpDate}
              followUpNote={followUpNote}
              onSave={handleCustomSave}
              onClear={handleClear}
              compact
            />
          </div>
        ) : (
          <div className="space-y-1 p-2">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Quick presets
            </p>
            {getPresets().map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors hover:bg-muted"
              >
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                {preset.label}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Clock className="h-3.5 w-3.5" />
              Custom date & time...
            </button>
            {followUpDate && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Clear follow-up
                </button>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
