"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MEDICAL_CONDITIONS } from "@/lib/data/medical-conditions"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase text-[#64748b] tracking-[0.5px]">
      {children}
    </label>
  )
}

interface MedicalHistorySectionProps {
  selectedConditions: string[]
  onConditionsChange: (conditions: string[]) => void
  medications: string
  onMedicationsChange: (value: string) => void
  duiHistory: boolean
  onDuiHistoryChange: (value: boolean) => void
  yearsSinceLastDui: number | undefined
  onYearsSinceLastDuiChange: (value: number | undefined) => void
}

function ConditionCombobox({
  selectedConditions,
  onSelect,
}: {
  selectedConditions: string[]
  onSelect: (conditionId: string) => void
}) {
  const [open, setOpen] = useState(false)

  const availableConditions = MEDICAL_CONDITIONS.filter(
    (c) => !selectedConditions.includes(c.id),
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1.5 flex w-full items-center justify-between rounded-sm border border-[#e2e8f0] bg-[#f9fafb] px-3 py-2 text-[12px] text-[#94a3b8] hover:bg-[#f1f5f9]"
        >
          Search conditions...
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search conditions..." className="text-[12px]" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-[12px] text-[#94a3b8]">
              No conditions found.
            </CommandEmpty>
            {Array.from(
              new Set(availableConditions.map((c) => c.category)),
            ).map((category) => (
              <CommandGroup key={category} heading={category}>
                {availableConditions
                  .filter((c) => c.category === category)
                  .map((condition) => (
                    <CommandItem
                      key={condition.id}
                      value={condition.label}
                      onSelect={() => {
                        onSelect(condition.id)
                        setOpen(false)
                      }}
                      className="text-[12px]"
                    >
                      {condition.label}
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function MedicalHistorySection({
  selectedConditions,
  onConditionsChange,
  medications,
  onMedicationsChange,
  duiHistory,
  onDuiHistoryChange,
  yearsSinceLastDui,
  onYearsSinceLastDuiChange,
}: MedicalHistorySectionProps) {
  const handleAddCondition = (conditionId: string) => {
    if (!selectedConditions.includes(conditionId)) {
      onConditionsChange([...selectedConditions, conditionId])
    }
  }

  const handleRemoveCondition = (conditionId: string) => {
    onConditionsChange(selectedConditions.filter((id) => id !== conditionId))
  }

  const conditionCount = selectedConditions.length + (duiHistory ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FieldLabel>Medical History</FieldLabel>
        {conditionCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1773cf] px-1 text-[9px] font-bold text-white">
            {conditionCount}
          </span>
        )}
      </div>

      {/* Conditions Combobox */}
      <div>
        <FieldLabel>Conditions</FieldLabel>
        <ConditionCombobox
          selectedConditions={selectedConditions}
          onSelect={handleAddCondition}
        />

        {selectedConditions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedConditions.map((conditionId) => {
              const condition = MEDICAL_CONDITIONS.find(
                (c) => c.id === conditionId,
              )
              return (
                <Badge
                  key={conditionId}
                  variant="secondary"
                  className="inline-flex items-center gap-1 rounded-sm border border-[#e2e8f0] bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#475569]"
                >
                  {condition?.label ?? conditionId}
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(conditionId)}
                    className="ml-0.5 text-[#94a3b8] hover:text-[#475569]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      {/* Medications */}
      <div>
        <FieldLabel>Medications</FieldLabel>
        <Input
          placeholder="e.g., Metformin, Lisinopril..."
          value={medications}
          onChange={(e) => onMedicationsChange(e.target.value)}
          className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[12px] text-[#0f172a] placeholder:text-[#94a3b8]"
        />
      </div>

      {/* DUI History */}
      <div>
        <div className="flex items-center justify-between">
          <FieldLabel>DUI History</FieldLabel>
          <Switch
            checked={duiHistory}
            onCheckedChange={onDuiHistoryChange}
            className="data-[state=checked]:bg-[#1773cf]"
          />
        </div>

        {duiHistory && (
          <div className="mt-2">
            <FieldLabel>Years Since Last DUI</FieldLabel>
            <Input
              type="number"
              min={0}
              max={50}
              placeholder="0"
              value={yearsSinceLastDui ?? ""}
              onChange={(e) => {
                const val = e.target.value
                onYearsSinceLastDuiChange(
                  val === "" ? undefined : Number(val),
                )
              }}
              className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[12px] text-[#0f172a]"
            />
          </div>
        )}
      </div>
    </div>
  )
}
