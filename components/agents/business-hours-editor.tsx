"use client"

import { useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BusinessHours, DayHours } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const

type DayKey = (typeof DAYS)[number]["key"]

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
] as const

const DEFAULT_HOURS: BusinessHours = {
  timezone: "America/New_York",
  schedule: {
    monday: { open: "09:00", close: "17:00" },
    tuesday: { open: "09:00", close: "17:00" },
    wednesday: { open: "09:00", close: "17:00" },
    thursday: { open: "09:00", close: "17:00" },
    friday: { open: "09:00", close: "17:00" },
    saturday: null,
    sunday: null,
  },
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BusinessHoursEditorProps {
  hours: BusinessHours | null
  afterHoursGreeting: string
  onHoursChange: (hours: BusinessHours | null) => void
  onAfterHoursGreetingChange: (greeting: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessHoursEditor({
  hours,
  afterHoursGreeting,
  onHoursChange,
  onAfterHoursGreetingChange,
}: BusinessHoursEditorProps) {
  const enabled = hours !== null

  const handleToggleEnabled = useCallback(
    (checked: boolean) => {
      onHoursChange(checked ? DEFAULT_HOURS : null)
    },
    [onHoursChange],
  )

  const handleTimezoneChange = useCallback(
    (tz: string) => {
      if (!hours) return
      onHoursChange({ ...hours, timezone: tz })
    },
    [hours, onHoursChange],
  )

  const handleDayToggle = useCallback(
    (day: DayKey, checked: boolean) => {
      if (!hours) return
      onHoursChange({
        ...hours,
        schedule: {
          ...hours.schedule,
          [day]: checked ? { open: "09:00", close: "17:00" } : null,
        },
      })
    },
    [hours, onHoursChange],
  )

  const handleTimeChange = useCallback(
    (day: DayKey, field: keyof DayHours, value: string) => {
      if (!hours) return
      const existing = hours.schedule[day]
      if (!existing) return
      onHoursChange({
        ...hours,
        schedule: {
          ...hours.schedule,
          [day]: { ...existing, [field]: value },
        },
      })
    },
    [hours, onHoursChange],
  )

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium">Business Hours</p>
          <p className="text-[11px] text-muted-foreground">
            Set your weekly schedule. The AI will share hours when asked.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggleEnabled}
          aria-label="Enable business hours"
        />
      </div>

      {enabled && hours && (
        <>
          {/* Timezone */}
          <div className="space-y-1.5">
            <Label className="text-xs">Timezone</Label>
            <Select value={hours.timezone} onValueChange={handleTimezoneChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weekly schedule */}
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => {
              const dayHours = hours.schedule[key]
              const isOpen = dayHours !== null
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <Switch
                    checked={isOpen}
                    onCheckedChange={(checked) => handleDayToggle(key, checked)}
                    aria-label={`${label} open`}
                    className="shrink-0"
                  />
                  <span className="w-24 text-[12px] font-medium">{label}</span>
                  {isOpen && dayHours ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) =>
                          handleTimeChange(key, "open", e.target.value)
                        }
                        className="h-7 w-28 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) =>
                          handleTimeChange(key, "close", e.target.value)
                        }
                        className="h-7 w-28 text-xs"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Closed
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* After-hours greeting */}
          <div className="space-y-1.5">
            <Label className="text-xs">After-Hours Greeting</Label>
            <Textarea
              value={afterHoursGreeting}
              onChange={(e) => onAfterHoursGreetingChange(e.target.value)}
              placeholder="Thank you for calling! Our office is currently closed. Our hours are Monday through Friday, 9 AM to 5 PM..."
              rows={2}
              maxLength={2000}
              className="text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Optional. If set, the AI will use this greeting outside business
              hours.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
