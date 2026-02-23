"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/* ------------------------------------------------------------------ */
/*  Date parsing helper                                                */
/* ------------------------------------------------------------------ */

const DATE_FORMATS = [
  "MM/dd/yyyy",
  "MM-dd-yyyy",
  "yyyy-MM-dd",
  "M/d/yyyy",
  "M-d-yyyy",
]

function parseInputDate(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  for (const fmt of DATE_FORMATS) {
    const result = parse(trimmed, fmt, new Date())
    if (isValid(result) && result.getFullYear() >= 1920 && result.getFullYear() <= new Date().getFullYear()) {
      return result
    }
  }
  return null
}

function isoToDisplay(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ""
  return format(date, "MM/dd/yyyy")
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface DatePickerInputProps {
  /** ISO date string (YYYY-MM-DD) or null */
  value: string | null
  /** Callback with ISO date string or null */
  onChange: (value: string | null) => void
  /** Input placeholder */
  placeholder?: string
  /** Additional className for the container */
  className?: string
  /** ID for the input element */
  id?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const CURRENT_YEAR = new Date().getFullYear()

export function DatePickerInput({
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  className,
  id,
}: DatePickerInputProps) {
  const [inputValue, setInputValue] = useState(() => isoToDisplay(value))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [error, setError] = useState(false)
  const prevValueRef = useRef(value)

  // Sync display when the external value changes (e.g. from enrichment auto-fill)
  useEffect(() => {
    if (value !== prevValueRef.current) {
      setInputValue(isoToDisplay(value))
      setError(false)
      prevValueRef.current = value
    }
  }, [value])

  const selectedDate = value ? new Date(value) : undefined
  const defaultMonth = selectedDate ?? new Date(1970, 0)

  const handleTextChange = useCallback(
    (raw: string) => {
      setInputValue(raw)
      setError(false)

      if (!raw.trim()) {
        onChange(null)
        prevValueRef.current = null
        return
      }

      const parsed = parseInputDate(raw)
      if (parsed) {
        const iso = format(parsed, "yyyy-MM-dd")
        prevValueRef.current = iso
        onChange(iso)
      }
    },
    [onChange],
  )

  const handleBlur = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      setError(false)
      return
    }

    const parsed = parseInputDate(trimmed)
    if (parsed) {
      setInputValue(format(parsed, "MM/dd/yyyy"))
      setError(false)
    } else {
      setError(true)
    }
  }, [inputValue])

  const handleCalendarSelect = useCallback(
    (date: Date | undefined) => {
      if (date) {
        const iso = format(date, "yyyy-MM-dd")
        const display = format(date, "MM/dd/yyyy")
        setInputValue(display)
        setError(false)
        prevValueRef.current = iso
        onChange(iso)
      } else {
        setInputValue("")
        setError(false)
        prevValueRef.current = null
        onChange(null)
      }
      setCalendarOpen(false)
    },
    [onChange],
  )

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        className={`flex-1 ${error ? "border-red-400 focus-visible:ring-red-400/30" : ""}`}
      />
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            type="button"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selectedDate}
            defaultMonth={defaultMonth}
            onSelect={handleCalendarSelect}
            fromYear={1920}
            toYear={CURRENT_YEAR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
