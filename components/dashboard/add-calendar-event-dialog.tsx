"use client"

import { useState, useCallback, useTransition, useRef } from "react"
import { format } from "date-fns"
import { CalendarIcon, Clock, Search, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { fetchLeads, updateLeadFields } from "@/lib/actions/leads"
import type { Lead } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Time options                                                       */
/* ------------------------------------------------------------------ */

const TIME_OPTIONS: { value: string; label: string }[] = []
for (let h = 7; h <= 20; h++) {
  for (const m of [0, 30]) {
    const hour24 = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    const period = h < 12 ? "AM" : "PM"
    const hour12 = h > 12 ? h - 12 : h
    const label = `${hour12}:${String(m).padStart(2, "0")} ${period}`
    TIME_OPTIONS.push({ value: hour24, label })
  }
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface AddCalendarEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-filled date from the clicked slot */
  initialDate?: Date
  /** Pre-filled hour from the clicked slot */
  initialHour?: number
  /** Called after event is created */
  onEventCreated?: () => void
}

/* ------------------------------------------------------------------ */
/*  Dialog wrapper — uses key to force re-mount on open                */
/* ------------------------------------------------------------------ */

export function AddCalendarEventDialog(props: AddCalendarEventDialogProps) {
  const [resetKey, setResetKey] = useState(0)

  function handleOpenChange(open: boolean) {
    if (open) {
      setResetKey((k) => k + 1)
    }
    props.onOpenChange(open)
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Schedule Follow-Up</DialogTitle>
        </DialogHeader>
        <AddCalendarEventForm
          key={resetKey}
          initialDate={props.initialDate}
          initialHour={props.initialHour}
          onClose={() => handleOpenChange(false)}
          onEventCreated={props.onEventCreated}
        />
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Inner form — remounted on each open for clean state                */
/* ------------------------------------------------------------------ */

function AddCalendarEventForm({
  initialDate,
  initialHour,
  onClose,
  onEventCreated,
}: {
  initialDate?: Date
  initialHour?: number
  onClose: () => void
  onEventCreated?: () => void
}) {
  const [isPending, startTransition] = useTransition()

  // Form state (initialized from props, reset by key-based remount)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate)
  const [selectedTime, setSelectedTime] = useState(
    initialHour !== undefined
      ? `${String(initialHour).padStart(2, "0")}:00`
      : "10:00",
  )
  const [note, setNote] = useState("")
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Lead selection
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const leadsLoadedRef = useRef(false)

  // Load leads on first interaction (search focus)
  const ensureLeadsLoaded = useCallback(async () => {
    if (leadsLoadedRef.current || leadsLoading) return
    leadsLoadedRef.current = true
    setLeadsLoading(true)
    const result = await fetchLeads()
    if (result.success && result.data) {
      setLeads(result.data)
    }
    setLeadsLoading(false)
  }, [leadsLoading])

  // Filter leads by search
  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery.trim()) return true
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ").toLowerCase()
    const phone = lead.phone?.toLowerCase() ?? ""
    const email = lead.email?.toLowerCase() ?? ""
    const q = searchQuery.toLowerCase()
    return name.includes(q) || phone.includes(q) || email.includes(q)
  })

  const selectedLead = leads.find((l) => l.id === selectedLeadId)

  function handleSave() {
    if (!selectedDate || !selectedLeadId) return

    startTransition(async () => {
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const dt = new Date(selectedDate)
      dt.setHours(hours, minutes, 0, 0)

      const result = await updateLeadFields(selectedLeadId, {
        followUpDate: dt.toISOString(),
        followUpNote: note.trim() || null,
      })

      if (result.success) {
        onClose()
        onEventCreated?.()
      } else {
        toast.error(result.error ?? "Failed to schedule follow-up")
      }
    })
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Lead selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Lead</Label>
        {selectedLead ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {[selectedLead.firstName, selectedLead.lastName]
                  .filter(Boolean)
                  .join(" ") || "Unknown"}
              </span>
              {selectedLead.phone && (
                <span className="text-xs text-muted-foreground">
                  {selectedLead.phone}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelectedLeadId(null)}
            >
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => void ensureLeadsLoaded()}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <ScrollArea className="max-h-36 rounded-md border">
              {leadsLoading ? (
                <p className="p-3 text-xs text-muted-foreground text-center">
                  Loading leads...
                </p>
              ) : filteredLeads.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground text-center">
                  {leads.length === 0
                    ? "Focus the search field to load leads"
                    : "No leads found"}
                </p>
              ) : (
                <div className="p-1">
                  {filteredLeads.slice(0, 20).map((lead) => {
                    const name =
                      [lead.firstName, lead.lastName]
                        .filter(Boolean)
                        .join(" ") || "Unknown"
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
                      >
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{name}</span>
                        {lead.phone && (
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                            {lead.phone}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Date picker */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Date</Label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-sm font-normal"
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {selectedDate
                ? format(selectedDate, "EEEE, MMM d, yyyy")
                : "Pick a date"}
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
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0))
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Time</Label>
        <Select value={selectedTime} onValueChange={setSelectedTime}>
          <SelectTrigger className="h-9 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
        <Label className="text-xs font-medium">Note (optional)</Label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 1000))}
          placeholder="Call back about term quote..."
          className="h-9 text-sm"
        />
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={!selectedDate || !selectedLeadId || isPending}
        className="w-full bg-[#1773cf] hover:bg-[#1565b8]"
      >
        {isPending ? "Scheduling..." : "Schedule Follow-Up"}
      </Button>
    </div>
  )
}
