"use client"

import { MessageSquare, MapPin, Volume2, ListChecks, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getTonePresetById } from "@/lib/telnyx/tone-presets"
import type { CollectFieldId, PostCallActionId, BusinessHours } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Label maps                                                         */
/* ------------------------------------------------------------------ */

const FIELD_LABELS: Record<CollectFieldId, string> = {
  name: "Name",
  phone: "Phone",
  reason: "Reason",
  callback_time: "Callback time",
  email: "Email",
  date_of_birth: "Date of birth",
  state: "State",
}

const ACTION_LABELS: Record<PostCallActionId, string> = {
  save_lead: "Save lead",
  book_calendar: "Book calendar",
  send_notification: "Notification",
}

const VOICE_LABELS: Record<string, string> = {
  "Telnyx.NaturalHD.astra": "Astra",
  "Telnyx.NaturalHD.celeste": "Celeste",
  "Telnyx.NaturalHD.orion": "Orion",
  "Telnyx.NaturalHD.nova": "Nova",
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ReviewStepProps {
  agentDisplayName: string
  businessName: string
  agentName: string
  state: string
  tonePreset: string
  voice: string
  greeting: string
  collectFields: CollectFieldId[]
  postCallActions: PostCallActionId[]
  businessHours: BusinessHours | null
  onAgentDisplayNameChange: (value: string) => void
}

/* ------------------------------------------------------------------ */
/*  Greeting resolver                                                  */
/* ------------------------------------------------------------------ */

function resolveGreetingPreview(
  greeting: string,
  agentName: string,
  businessName: string,
): string {
  const business = businessName || `${agentName}'s office`
  return greeting
    .replace(/\{agent\}/g, agentName || "your agent")
    .replace(/\{business\}/g, business)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ReviewStep({
  agentDisplayName,
  businessName,
  agentName,
  state,
  tonePreset,
  voice,
  greeting,
  collectFields,
  postCallActions,
  businessHours,
  onAgentDisplayNameChange,
}: ReviewStepProps) {
  const tone = getTonePresetById(tonePreset)
  const resolvedGreeting = greeting
    ? resolveGreetingPreview(greeting, agentName, businessName)
    : "Hi, how can I help you today?"

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          Review your agent
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Everything looks good? You can customize these settings after creation.
        </p>
      </div>

      {/* Agent name */}
      <div className="space-y-1.5">
        <Label htmlFor="wizard-display-name" className="text-xs">
          Agent Name
        </Label>
        <Input
          id="wizard-display-name"
          value={agentDisplayName}
          onChange={(e) => onAgentDisplayNameChange(e.target.value)}
          placeholder="e.g., Acme Insurance Intake Agent"
          maxLength={200}
        />
      </div>

      {/* Greeting preview */}
      <div className="space-y-1.5">
        <Label className="text-xs">Greeting Preview</Label>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#1773cf]" />
            <p className="text-[13px] leading-relaxed text-foreground italic">
              &ldquo;{resolvedGreeting}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid gap-2 sm:grid-cols-2">
        {/* Tone */}
        {tone && (
          <SummaryCard label="Tone" value={tone.label} />
        )}

        {/* Voice */}
        <SummaryCard
          label="Voice"
          value={VOICE_LABELS[voice] || voice}
          icon={<Volume2 className="h-3.5 w-3.5" />}
        />

        {/* Business */}
        {businessName && (
          <SummaryCard label="Business" value={businessName} />
        )}

        {/* Location */}
        {state && (
          <SummaryCard
            label="Location"
            value={state}
            icon={<MapPin className="h-3.5 w-3.5" />}
          />
        )}

        {/* Collect fields */}
        <SummaryCard
          label="Collects"
          value={collectFields.map((f) => FIELD_LABELS[f]).join(", ")}
          icon={<ListChecks className="h-3.5 w-3.5" />}
        />

        {/* Actions */}
        <SummaryCard
          label="After call"
          value={postCallActions.map((a) => ACTION_LABELS[a]).join(", ")}
        />

        {/* Hours */}
        {businessHours && (
          <SummaryCard
            label="Hours"
            value="Configured"
            icon={<Clock className="h-3.5 w-3.5" />}
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary card atom                                                  */
/* ------------------------------------------------------------------ */

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-[12px] text-foreground line-clamp-2">{value}</p>
    </div>
  )
}
