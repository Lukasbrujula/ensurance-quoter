"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
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
import type { CustomFieldDefinition, CustomFieldValuesMap } from "@/lib/types/custom-fields"

/* ------------------------------------------------------------------ */
/*  Lead Custom Fields Section                                          */
/* ------------------------------------------------------------------ */

interface LeadCustomFieldsProps {
  leadId: string
}

export function LeadCustomFields({ leadId }: LeadCustomFieldsProps) {
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([])
  const [values, setValues] = useState<CustomFieldValuesMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Load definitions + values
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [defsRes, valsRes] = await Promise.all([
          fetch("/api/settings/custom-fields"),
          fetch(`/api/custom-field-values?leadId=${leadId}`),
        ])

        if (cancelled) return

        if (defsRes.ok && valsRes.ok) {
          const defsData = await defsRes.json()
          const valsData = await valsRes.json()
          setDefinitions(defsData.definitions ?? [])
          setValues(valsData.values ?? {})
        }
      } catch {
        // Silently fail — custom fields are supplementary
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [leadId])

  // Clean up timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
    }
  }, [])

  const saveValue = useCallback(
    (fieldDefinitionId: string, value: string | null) => {
      // Clear existing timer for this field
      const existing = debounceTimers.current.get(fieldDefinitionId)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        try {
          const res = await fetch("/api/custom-field-values", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId,
              fieldDefinitionId,
              value,
            }),
          })
          if (!res.ok) throw new Error("save failed")
        } catch {
          toast.error("Failed to save custom field")
        }
      }, 500)

      debounceTimers.current.set(fieldDefinitionId, timer)
    },
    [leadId],
  )

  const handleChange = useCallback(
    (fieldDefinitionId: string, value: string | null) => {
      setValues((prev) => ({ ...prev, [fieldDefinitionId]: value }))
      saveValue(fieldDefinitionId, value)
    },
    [saveValue],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (definitions.length === 0) return null

  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Custom Fields
      </Label>
      <div className="space-y-2">
        {definitions.map((def) => (
          <CustomFieldInput
            key={def.id}
            definition={def}
            value={values[def.id] ?? null}
            onChange={(val) => handleChange(def.id, val)}
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Individual Field Renderer                                           */
/* ------------------------------------------------------------------ */

interface CustomFieldInputProps {
  definition: CustomFieldDefinition
  value: string | null
  onChange: (value: string | null) => void
}

function CustomFieldInput({ definition, value, onChange }: CustomFieldInputProps) {
  const { fieldName, fieldType, options, isRequired } = definition

  const label = (
    <Label className="text-[10px] text-muted-foreground">
      {fieldName}
      {isRequired && <span className="ml-0.5 text-red-500">*</span>}
    </Label>
  )

  switch (fieldType) {
    case "text":
      return (
        <div>
          {label}
          <Input
            className="h-8 text-[12px]"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={fieldName}
          />
          {isRequired && !value && (
            <span className="text-[10px] text-red-500">Required</span>
          )}
        </div>
      )

    case "number":
      return (
        <div>
          {label}
          <Input
            className="h-8 text-[12px]"
            type="number"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={fieldName}
          />
          {isRequired && !value && (
            <span className="text-[10px] text-red-500">Required</span>
          )}
        </div>
      )

    case "date":
      return (
        <div>
          {label}
          <Input
            className="h-8 text-[12px]"
            type="date"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
          {isRequired && !value && (
            <span className="text-[10px] text-red-500">Required</span>
          )}
        </div>
      )

    case "select":
      return (
        <div>
          {label}
          <Select
            value={value || "__none__"}
            onValueChange={(v) => onChange(v === "__none__" ? null : v)}
          >
            <SelectTrigger className="h-8 text-[12px]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— None —</SelectItem>
              {(options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isRequired && !value && (
            <span className="text-[10px] text-red-500">Required</span>
          )}
        </div>
      )

    case "boolean":
      return (
        <div className="flex items-center justify-between py-1">
          <Label className="text-[10px] text-muted-foreground cursor-pointer">
            {fieldName}
          </Label>
          <Switch
            checked={value === "true"}
            onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
          />
        </div>
      )

    default:
      return null
  }
}
