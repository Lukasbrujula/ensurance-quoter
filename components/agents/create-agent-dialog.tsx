"use client"

import { useState, useCallback } from "react"
import {
  RefreshCw,
  Phone,
  Moon,
  CalendarPlus,
  HelpCircle,
  ArrowLeft,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AGENT_TEMPLATES, type AgentTemplate } from "@/lib/telnyx/agent-templates"

/* ------------------------------------------------------------------ */
/*  Voice options (Telnyx available voices)                             */
/* ------------------------------------------------------------------ */

const VOICE_OPTIONS = [
  { value: "Telnyx.NaturalHD.astra", label: "Astra (Natural HD)" },
  { value: "Telnyx.NaturalHD.celeste", label: "Celeste (Natural HD)" },
  { value: "Telnyx.NaturalHD.orion", label: "Orion (Natural HD)" },
  { value: "Telnyx.NaturalHD.nova", label: "Nova (Natural HD)" },
] as const

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

const ICON_MAP = {
  Phone,
  Moon,
  CalendarPlus,
  HelpCircle,
} as const

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

type Step = "template" | "customize"

export function CreateAgentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAgentDialogProps) {
  const [step, setStep] = useState<Step>("template")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [voice, setVoice] = useState("Telnyx.NaturalHD.astra")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setStep("template")
    setSelectedTemplateId(null)
    setName("")
    setDescription("")
    setPhoneNumber("")
    setVoice("Telnyx.NaturalHD.astra")
    setError(null)
  }, [])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetForm()
      onOpenChange(nextOpen)
    },
    [onOpenChange, resetForm],
  )

  const handleSelectTemplate = useCallback((template: AgentTemplate) => {
    setSelectedTemplateId(template.id)
    setName(template.suggestedName)
    setDescription(template.description)
    setVoice(template.voice)
    setError(null)
    setStep("customize")
  }, [])

  const handleStartFromScratch = useCallback(() => {
    setSelectedTemplateId(null)
    setName("")
    setDescription("")
    setVoice("Telnyx.NaturalHD.astra")
    setError(null)
    setStep("customize")
  }, [])

  const handleBack = useCallback(() => {
    setStep("template")
    setError(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setError(null)

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
          voice,
          template_id: selectedTemplateId ?? undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create agent")
      }

      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success("Agent created successfully")
      }

      resetForm()
      onCreated()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create agent"
      setError(message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "template" ? (
          <TemplateStep
            onSelectTemplate={handleSelectTemplate}
            onStartFromScratch={handleStartFromScratch}
          />
        ) : (
          <CustomizeStep
            templateId={selectedTemplateId}
            name={name}
            description={description}
            phoneNumber={phoneNumber}
            voice={voice}
            creating={creating}
            error={error}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onPhoneChange={setPhoneNumber}
            onVoiceChange={setVoice}
            onBack={handleBack}
            onCancel={() => handleOpenChange(false)}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 1: Template Selection                                         */
/* ------------------------------------------------------------------ */

function TemplateStep({
  onSelectTemplate,
  onStartFromScratch,
}: {
  onSelectTemplate: (template: AgentTemplate) => void
  onStartFromScratch: () => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Create AI Agent</DialogTitle>
        <DialogDescription>
          Choose a template to get started quickly, or start from scratch.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3 py-2">
        {AGENT_TEMPLATES.map((template) => {
          const Icon = ICON_MAP[template.icon]
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className="flex flex-col items-start gap-2 rounded-lg border-2 border-muted p-4 text-left transition-colors hover:border-[#1773cf] hover:bg-[#eff6ff]/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eff6ff]">
                <Icon className="h-4 w-4 text-[#1773cf]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#0f172a]">
                  {template.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onStartFromScratch}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-[#64748b] hover:text-[#0f172a]"
      >
        <Plus className="h-4 w-4" />
        Start from scratch
      </button>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Step 2: Customize Form                                             */
/* ------------------------------------------------------------------ */

function CustomizeStep({
  templateId,
  name,
  description,
  phoneNumber,
  voice,
  creating,
  error,
  onNameChange,
  onDescriptionChange,
  onPhoneChange,
  onVoiceChange,
  onBack,
  onCancel,
  onSubmit,
}: {
  templateId: string | null
  name: string
  description: string
  phoneNumber: string
  voice: string
  creating: boolean
  error: string | null
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onVoiceChange: (v: string) => void
  onBack: () => void
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const template = templateId
    ? AGENT_TEMPLATES.find((t) => t.id === templateId)
    : undefined

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <DialogTitle>
              {template ? `Customize — ${template.name}` : "Create AI Agent"}
            </DialogTitle>
            <DialogDescription>
              {template
                ? "Adjust the pre-filled settings, then create your agent."
                : "Set up a new AI voice agent from scratch."}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {template && (
        <div className="flex items-center gap-2 rounded-md bg-[#eff6ff] px-3 py-2">
          {(() => {
            const Icon = ICON_MAP[template.icon]
            return <Icon className="h-3.5 w-3.5 shrink-0 text-[#1773cf]" />
          })()}
          <span className="text-[12px] font-medium text-[#1773cf]">
            {template.name} template
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="agent-name">Name *</Label>
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Insurance Intake Agent"
            required
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="agent-description">Description</Label>
          <Textarea
            id="agent-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="What does this agent handle?"
            rows={2}
            maxLength={500}
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="agent-phone">Phone Number</Label>
          <Input
            id="agent-phone"
            value={phoneNumber}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+1XXXXXXXXXX (E.164)"
            maxLength={30}
          />
          <p className="text-xs text-muted-foreground">
            Telnyx phone number in E.164 format. Optional — configure later.
          </p>
        </div>

        {/* Voice */}
        <div className="space-y-2">
          <Label htmlFor="agent-voice">Voice</Label>
          <Select value={voice} onValueChange={onVoiceChange}>
            <SelectTrigger id="agent-voice">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={creating || !name.trim()}>
            {creating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Agent"
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
