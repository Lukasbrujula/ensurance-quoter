"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { US_STATES } from "@/lib/data/us-states"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PhoneNumberOption {
  id: string
  phoneNumber: string
  aiAgentId: string | null
  label: string | null
  voiceEnabled: boolean
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format E.164 "+19076153861" → "(907) 615-3861" */
function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4)
    const prefix = digits.slice(4, 7)
    const line = digits.slice(7)
    return `(${area}) ${prefix}-${line}`
  }
  return e164
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BusinessStepProps {
  businessName: string
  agentName: string
  state: string
  phoneNumber: string
  /** Current agent ID when editing an existing agent */
  editingAgentId?: string
  onBusinessNameChange: (value: string) => void
  onAgentNameChange: (value: string) => void
  onStateChange: (value: string) => void
  onPhoneNumberChange: (value: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessStep({
  businessName,
  agentName,
  state,
  phoneNumber,
  editingAgentId,
  onBusinessNameChange,
  onAgentNameChange,
  onStateChange,
  onPhoneNumberChange,
}: BusinessStepProps) {
  const [numbers, setNumbers] = useState<PhoneNumberOption[]>([])
  const [loadingNumbers, setLoadingNumbers] = useState(true)
  const [numberError, setNumberError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchNumbers() {
      try {
        const res = await fetch("/api/phone-numbers")
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        if (cancelled) return

        const all: PhoneNumberOption[] = (data.numbers ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (n: any) => ({
            id: n.id,
            phoneNumber: n.phoneNumber,
            aiAgentId: n.aiAgentId,
            label: n.label,
            voiceEnabled: n.voiceEnabled,
          }),
        )

        // Filter: voice-enabled AND (unassigned OR assigned to current agent)
        const available = all.filter(
          (n) =>
            n.voiceEnabled &&
            (n.aiAgentId === null || n.aiAgentId === editingAgentId),
        )

        setNumbers(available)
      } catch {
        if (!cancelled) setNumberError(true)
      } finally {
        if (!cancelled) setLoadingNumbers(false)
      }
    }

    fetchNumbers()
    return () => { cancelled = true }
  }, [editingAgentId])

  const hasNumbers = numbers.length > 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          About your business
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          This helps your AI agent introduce itself and sound natural.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="wizard-business-name" className="text-xs">
            Business Name
          </Label>
          <Input
            id="wizard-business-name"
            value={businessName}
            onChange={(e) => onBusinessNameChange(e.target.value)}
            placeholder="e.g., Acme Insurance Group"
            maxLength={200}
          />
          <p className="text-[10px] text-muted-foreground">
            Used in the greeting and caller interactions.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wizard-agent-name" className="text-xs">
            Your Name
          </Label>
          <Input
            id="wizard-agent-name"
            value={agentName}
            onChange={(e) => onAgentNameChange(e.target.value)}
            placeholder="e.g., John Smith"
            maxLength={100}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wizard-state" className="text-xs">
              State
            </Label>
            <Select value={state} onValueChange={onStateChange}>
              <SelectTrigger id="wizard-state">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wizard-phone" className="text-xs">
              Phone Number
            </Label>
            {loadingNumbers ? (
              <Select disabled>
                <SelectTrigger id="wizard-phone">
                  <SelectValue placeholder="Loading numbers..." />
                </SelectTrigger>
              </Select>
            ) : numberError ? (
              <Select disabled>
                <SelectTrigger id="wizard-phone">
                  <SelectValue placeholder="Failed to load numbers" />
                </SelectTrigger>
              </Select>
            ) : hasNumbers ? (
              <Select value={phoneNumber} onValueChange={onPhoneNumberChange}>
                <SelectTrigger id="wizard-phone">
                  <SelectValue placeholder="Select a number" />
                </SelectTrigger>
                <SelectContent>
                  {numbers.map((n) => (
                    <SelectItem key={n.id} value={n.phoneNumber}>
                      {formatPhoneDisplay(n.phoneNumber)}
                      {n.label ? ` — ${n.label}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Select disabled>
                  <SelectTrigger id="wizard-phone">
                    <SelectValue placeholder="No numbers available" />
                  </SelectTrigger>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  <Link
                    href="/settings/integrations"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Purchase a number in Settings &rarr;
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
