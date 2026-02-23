"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAgentDialogProps) {
  const [name, setName] = useState("Insurance Intake Agent")
  const [description, setDescription] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [voice, setVoice] = useState("Telnyx.NaturalHD.astra")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Reset form
      setName("Insurance Intake Agent")
      setDescription("")
      setPhoneNumber("")
      setVoice("Telnyx.NaturalHD.astra")
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create AI Agent</DialogTitle>
          <DialogDescription>
            Set up a new AI voice agent to handle calls when you&apos;re
            unavailable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="agent-name">Name *</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setDescription(e.target.value)}
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
              onChange={(e) => setPhoneNumber(e.target.value)}
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
            <Select value={voice} onValueChange={setVoice}>
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
              onClick={() => onOpenChange(false)}
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
      </DialogContent>
    </Dialog>
  )
}
