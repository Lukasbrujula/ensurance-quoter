"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { US_STATES } from "@/lib/data/us-states"

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface BusinessStepProps {
  businessName: string
  agentName: string
  state: string
  phoneNumber: string
  afterHoursMode: boolean
  onBusinessNameChange: (value: string) => void
  onAgentNameChange: (value: string) => void
  onStateChange: (value: string) => void
  onPhoneNumberChange: (value: string) => void
  onAfterHoursModeChange: (enabled: boolean) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function BusinessStep({
  businessName,
  agentName,
  state,
  phoneNumber,
  afterHoursMode,
  onBusinessNameChange,
  onAgentNameChange,
  onStateChange,
  onPhoneNumberChange,
  onAfterHoursModeChange,
}: BusinessStepProps) {
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
              Telnyx Phone Number
            </Label>
            <Input
              id="wizard-phone"
              value={phoneNumber}
              onChange={(e) => onPhoneNumberChange(e.target.value)}
              placeholder="+1XXXXXXXXXX"
              maxLength={30}
            />
          </div>
        </div>
      </div>

      {/* After-hours toggle */}
      <div className="flex items-start gap-3 rounded-lg border border-muted bg-muted/20 p-3">
        <Switch
          id="after-hours-toggle"
          checked={afterHoursMode}
          onCheckedChange={onAfterHoursModeChange}
        />
        <div className="min-w-0">
          <Label
            htmlFor="after-hours-toggle"
            className="text-[13px] font-medium cursor-pointer"
          >
            Enable after-hours mode
          </Label>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Agent will tell callers you&apos;re unavailable and collect their info for a callback
          </p>
        </div>
      </div>
    </div>
  )
}
