"use client"

import { Heart, Briefcase, Zap, Coffee } from "lucide-react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { TONE_PRESETS, type TonePreset } from "@/lib/telnyx/tone-presets"

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const TONE_ICON_MAP = {
  Heart,
  Briefcase,
  Zap,
  Coffee,
} as const

/* ------------------------------------------------------------------ */
/*  Voice options                                                      */
/* ------------------------------------------------------------------ */

interface VoiceOption {
  value: string
  label: string
  description: string
}

const VOICE_OPTIONS: readonly VoiceOption[] = [
  { value: "Telnyx.NaturalHD.astra", label: "Astra", description: "Warm, friendly tone" },
  { value: "Telnyx.NaturalHD.orion", label: "Orion", description: "Calm, steady tone" },
  { value: "Telnyx.NaturalHD.celeste", label: "Celeste", description: "Clear, bright tone" },
  { value: "Telnyx.NaturalHD.andersen_johan", label: "Johan", description: "Deep, reassuring tone" },
] as const

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PersonalityStepProps {
  tonePreset: string
  voice: string
  onTonePresetChange: (id: string) => void
  onVoiceChange: (value: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PersonalityStep({
  tonePreset,
  voice,
  onTonePresetChange,
  onVoiceChange,
}: PersonalityStepProps) {
  return (
    <div className="space-y-5">
      {/* Tone selection */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Tone</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How should your AI agent sound on the phone?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {TONE_PRESETS.map((preset: TonePreset) => {
            const Icon = TONE_ICON_MAP[preset.icon]
            const isSelected = tonePreset === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onTonePresetChange(preset.id)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors",
                  isSelected
                    ? "border-[#1773cf] bg-[#eff6ff]/50"
                    : "border-muted hover:border-[#94a3b8]",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    isSelected ? "bg-[#1773cf] text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {preset.label}
                  </p>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {preset.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tone example preview */}
      {(() => {
        const selectedPreset = TONE_PRESETS.find((p) => p.id === tonePreset)
        if (!selectedPreset) return null
        return (
          <div className="rounded-lg border border-muted bg-muted/20 p-3 space-y-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Example greeting
              </p>
              <p className="mt-0.5 text-[12px] italic text-foreground leading-relaxed">
                &ldquo;{selectedPreset.exampleGreeting}&rdquo;
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Example response
              </p>
              <p className="mt-0.5 text-[12px] italic text-foreground leading-relaxed">
                &ldquo;{selectedPreset.exampleResponse}&rdquo;
              </p>
            </div>
          </div>
        )
      })()}

      {/* Voice selection */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Voice</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose a voice for your AI agent.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {VOICE_OPTIONS.map((opt) => {
            const isSelected = voice === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onVoiceChange(opt.value)}
                className={cn(
                  "rounded-lg border-2 px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "border-[#1773cf] bg-[#eff6ff]/50"
                    : "border-muted hover:border-[#94a3b8]",
                )}
              >
                <p className="text-[13px] font-medium text-foreground">
                  {opt.label}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {opt.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
