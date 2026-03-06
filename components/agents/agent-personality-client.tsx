"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  ChevronDown,
  Languages,
  Loader2,
  Mic,
  Save,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { AiAgentRow } from "@/lib/types/database"
import { EditStepNav } from "./edit-step-nav"

/* ------------------------------------------------------------------ */
/*  Tone presets                                                       */
/* ------------------------------------------------------------------ */

type TonePresetId = "warm" | "professional" | "direct"

interface ToneOption {
  id: TonePresetId
  title: string
  description: string
  exampleGreeting: string
  personalityText: string
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: "warm",
    title: "Warm & Friendly",
    description: "Conversational and empathetic, like a trusted neighbor.",
    exampleGreeting:
      "Hi there! Thanks so much for calling {business}. How can I help you today?",
    personalityText: [
      "You have a warm and empathetic personality.",
      "Use the caller's first name once you know it.",
      "Your tone is conversational, like a trusted neighbor.",
      'Use phrases like "I completely understand" and "That is a great question."',
      "Be patient and let the caller take their time.",
      "You sound like someone who genuinely cares about helping.",
    ].join(" "),
  },
  {
    id: "professional",
    title: "Professional",
    description: "Polished and thorough, like a trusted advisor.",
    exampleGreeting:
      "Good afternoon, thank you for calling {business}. How may I assist you?",
    personalityText: [
      "You have a polished and professional demeanor.",
      'Address callers as "sir" or "ma\'am" when appropriate.',
      "Your tone is thorough and reassuring, like a trusted advisor.",
      'Use phrases like "Absolutely, I can help with that" and "Let me make sure I have that right."',
      "Be courteous and efficient without rushing the caller.",
      "You sound like someone who handles important matters with care.",
    ].join(" "),
  },
  {
    id: "direct",
    title: "Quick & Direct",
    description: "Efficient and action-oriented. Respects the caller's time.",
    exampleGreeting: "{business}, how can I help?",
    personalityText: [
      "You are efficient and get straight to the point.",
      "Keep responses brief and action-oriented.",
      "Minimal small talk. Acknowledge what the caller said, then move forward.",
      'Use phrases like "Got it" and "Let me get that noted."',
      "Respect the caller's time above all else.",
      "You sound like someone who knows exactly what to do.",
    ].join(" "),
  },
]

/* ------------------------------------------------------------------ */
/*  Voice options                                                      */
/* ------------------------------------------------------------------ */

interface VoiceOption {
  id: string
  name: string
  gender: string
  description: string
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "Telnyx.NaturalHD.astra",
    name: "Astra",
    gender: "Female",
    description: "Warm and approachable with a clear, natural tone.",
  },
  {
    id: "Telnyx.NaturalHD.orion",
    name: "Orion",
    gender: "Male",
    description: "Calm and confident with a steady, reassuring delivery.",
  },
  {
    id: "Telnyx.NaturalHD.celeste",
    name: "Celeste",
    gender: "Female",
    description: "Bright and professional with a friendly energy.",
  },
]

/* ------------------------------------------------------------------ */
/*  Form state                                                         */
/* ------------------------------------------------------------------ */

interface PersonalityFormState {
  tonePreset: TonePresetId
  voice: string
  spanishEnabled: boolean
}

const INITIAL_STATE: PersonalityFormState = {
  tonePreset: "professional",
  voice: "Telnyx.NaturalHD.astra",
  spanishEnabled: false,
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function PersonalitySkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-5 w-96" />
      <Skeleton className="h-48 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AgentPersonalityClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("id")

  const [form, setForm] = useState<PersonalityFormState>(INITIAL_STATE)
  const [original, setOriginal] = useState<PersonalityFormState>(INITIAL_STATE)
  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [showPersonalityDetail, setShowPersonalityDetail] = useState(false)

  const isEditMode = Boolean(editId)

  // Load existing agent when editing
  useEffect(() => {
    if (!editId) return

    async function fetchAgent() {
      try {
        const res = await fetch(`/api/agents/${editId}`)
        if (!res.ok) throw new Error("Failed to load agent")
        const json = await res.json()
        const agent: AiAgentRow = json.agent

        const loaded: PersonalityFormState = {
          tonePreset: (agent.tone_preset as TonePresetId) ?? "professional",
          voice: agent.voice ?? "Telnyx.NaturalHD.astra",
          spanishEnabled: agent.spanish_enabled ?? false,
        }
        setForm(loaded)
        setOriginal(loaded)
      } catch (error) {
        toast.error("Failed to load agent details")
        console.error(
          "fetchAgent error:",
          error instanceof Error ? error.message : String(error),
        )
      } finally {
        setLoading(false)
      }
    }

    fetchAgent()
  }, [editId])

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(original),
    [form, original],
  )

  const selectedTone = useMemo(
    () => TONE_OPTIONS.find((t) => t.id === form.tonePreset) ?? TONE_OPTIONS[1],
    [form.tonePreset],
  )

  const handleSave = useCallback(async () => {
    if (!editId) return

    setSaving(true)
    try {
      const res = await fetch(`/api/agents/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone_preset: form.tonePreset,
          voice: form.voice,
          spanish_enabled: form.spanishEnabled,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error ?? "Failed to update agent")
      }

      toast.success("Personality settings saved")
      setOriginal(form)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [form, editId])

  if (loading) return <PersonalitySkeleton />

  return (
    <ScrollArea className="h-full">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 gap-1.5 text-muted-foreground"
            onClick={() =>
              editId ? router.push(`/agents/${editId}`) : router.push("/agents")
            }
          >
            <ArrowLeft className="h-4 w-4" />
            {editId ? "Back to Agent" : "Back to Agents"}
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Personality & Voice
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how your AI agent sounds and behaves on calls.
          </p>
        </div>

        <div className="space-y-6">
          {/* Tone Selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Conversation Tone</CardTitle>
              </div>
              <CardDescription>
                How your agent speaks to callers. This sets the overall
                personality and phrasing style.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tone cards */}
              <div className="grid gap-3 md:grid-cols-3">
                {TONE_OPTIONS.map((tone) => {
                  const isSelected = form.tonePreset === tone.id
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          tonePreset: tone.id,
                        }))
                      }
                      className={cn(
                        "cursor-pointer rounded-lg border p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50",
                      )}
                    >
                      <p className="text-sm font-medium">{tone.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tone.description}
                      </p>
                      <p className="mt-3 text-xs italic text-muted-foreground/80">
                        &ldquo;{tone.exampleGreeting.replace(
                          "{business}",
                          "your office",
                        )}&rdquo;
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* What this changes — collapsible */}
              <Collapsible
                open={showPersonalityDetail}
                onOpenChange={setShowPersonalityDetail}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        showPersonalityDetail && "rotate-180",
                      )}
                    />
                    What this changes
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 rounded-md border bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Personality instructions sent to the AI:
                    </p>
                    <p className="text-xs leading-relaxed text-foreground/80">
                      {selectedTone.personalityText}
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Voice Selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Voice</CardTitle>
              </div>
              <CardDescription>
                The text-to-speech voice your agent uses on calls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {VOICE_OPTIONS.map((v) => {
                  const isSelected = form.voice === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, voice: v.id }))
                      }
                      className={cn(
                        "cursor-pointer rounded-lg border p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{v.name}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {v.gender}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {v.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Spanish Handoff Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">
                  Spanish Language Support
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Switch
                  checked={form.spanishEnabled}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, spanishEnabled: checked }))
                  }
                  aria-label="Enable Spanish-speaking agent"
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Enable Spanish-speaking agent
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Callers who speak Spanish will be automatically transferred
                    to a Spanish-speaking AI assistant. This creates a second
                    agent with the same knowledge base, translated to Spanish.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Separator />
          <div className="flex items-center justify-between pb-4">
            <Button
              variant="outline"
              onClick={() =>
                editId
                  ? router.push(`/agents/${editId}`)
                  : router.push("/agents")
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty || !isEditMode}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Step navigation */}
          {editId && (
            <div className="pb-8">
              <EditStepNav currentPath="/agents/personality" agentId={editId} />
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
