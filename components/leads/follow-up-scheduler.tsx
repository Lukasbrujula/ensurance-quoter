"use client"

import { useState, useCallback } from "react"
import { CalendarIcon, Clock, X } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/* ------------------------------------------------------------------ */
/*  Time options (30-min intervals)                                    */
/* ------------------------------------------------------------------ */

const TIME_OPTIONS: { value: string; label: string }[] = []
for (let h = 8; h <= 20; h++) {
  for (const m of [0, 30]) {
    const hour24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    const period = h < 12 ? "AM" : "PM"
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const label = `${hour12}:${String(m).padStart(2, "0")} ${period}`
    TIME_OPTIONS.push({ value: hour24, label })
  }
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface FollowUpSchedulerProps {
  /** Current follow-up date ISO string or null */
  followUpDate: string | null
  /** Current follow-up note or null */
  followUpNote: string | null
  /** Called when user saves a follow-up */
  onSave: (date: string, note: string | null) => void
  /** Called when user clears the follow-up */
  onClear: () => void
  /** Compact mode for inline popover use */
  compact?: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function FollowUpScheduler({
  followUpDate,
  followUpNote,
  onSave,
  onClear,
  compact = false,
}: FollowUpSchedulerProps) {
  // Parse existing follow-up date
  const existingDate = followUpDate ? new Date(followUpDate) : null
  const existingTime = existingDate
    ? `${String(existingDate.getHours()).padStart(2, "0")}:${String(existingDate.getMinutes()).padStart(2, "0")}`
    : "10:00"

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    existingDate ?? undefined,
  )
  const [selectedTime, setSelectedTime] = useState(existingTime)
  const [note, setNote] = useState(followUpNote ?? "")
  const [calendarOpen, setCalendarOpen] = useState(false)

  const handleSave = useCallback(() => {
    if (!selectedDate) return
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const dt = new Date(selectedDate)
    dt.setHours(hours, minutes, 0, 0)
    onSave(dt.toISOString(), note.trim() || null)
  }, [selectedDate, selectedTime, note, onSave])

  const handleClear = useCallback(() => {
    setSelectedDate(undefined)
    setSelectedTime("10:00")
    setNote("")
    onClear()
  }, [onClear])

  const hasFollowUp = followUpDate !== null

  return (
    <div className={compact ? "space-y-3" : "space-y-3 rounded-md border border-[#e2e8f0] bg-white p-3"}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-bold text-[#0f172a]">Follow-Up</h4>
          {hasFollowUp && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-[10px] text-[#94a3b8] hover:text-red-500"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Date picker */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium text-[#475569]">Date</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-[11px] font-normal"
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date ?? undefined)
                setCalendarOpen(false)
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time select */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium text-[#475569]">Time</Label>
        <Select value={selectedTime} onValueChange={setSelectedTime}>
          <SelectTrigger className="h-8 text-[11px]">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-[#94a3b8]" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-medium text-[#475569]">Note</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 1000))}
          placeholder="Call back about term quote..."
          className="h-8 text-[11px]"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={!selectedDate}
          size="sm"
          className="flex-1 bg-[#1773cf] text-[11px] font-bold hover:bg-[#1565b8]"
        >
          {hasFollowUp ? "Update Follow-Up" : "Schedule Follow-Up"}
        </Button>
        {compact && hasFollowUp && (
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className="text-[11px]"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Follow-up indicator for leads list                                 */
/* ------------------------------------------------------------------ */

export type FollowUpUrgency = "overdue" | "today" | "upcoming" | "none"

export function getFollowUpUrgency(followUpDate: string | null): FollowUpUrgency {
  if (!followUpDate) return "none"
  const now = new Date()
  const fu = new Date(followUpDate)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const fuDay = new Date(fu.getFullYear(), fu.getMonth(), fu.getDate())

  if (fuDay < today) return "overdue"
  if (fuDay.getTime() === today.getTime()) return "today"
  return "upcoming"
}

const URGENCY_STYLES: Record<FollowUpUrgency, { color: string; label: string }> = {
  overdue: { color: "text-red-500", label: "Overdue" },
  today: { color: "text-amber-500", label: "Today" },
  upcoming: { color: "text-blue-500", label: "Upcoming" },
  none: { color: "", label: "" },
}

export function FollowUpIndicator({
  followUpDate,
  followUpNote,
}: {
  followUpDate: string | null
  followUpNote: string | null
}) {
  const urgency = getFollowUpUrgency(followUpDate)
  if (urgency === "none") return null

  const { color, label } = URGENCY_STYLES[urgency]
  const fu = new Date(followUpDate!)
  const dateStr = format(fu, "MMM d")
  const timeStr = format(fu, "h:mm a")
  const tooltip = `${label}: ${dateStr} at ${timeStr}${followUpNote ? ` — ${followUpNote}` : ""}`

  return (
    <span title={tooltip} className={`inline-flex items-center gap-0.5 ${color}`}>
      <Clock className="h-3 w-3" />
    </span>
  )
}
