"use client"

import { useState, useMemo } from "react"
import { ChevronsUpDown, X } from "lucide-react"
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
import { RX_NAMES } from "@/lib/data/rx-names"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.5px]">
      {children}
    </label>
  )
}

interface MedicalHistorySectionProps {
  selectedConditions: string[]
  onConditionsChange: (conditions: string[]) => void
  selectedMedications: string[]
  onMedicationsChange: (medications: string[]) => void
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
          className="mt-1.5 flex w-full items-center justify-between rounded-sm border border-border bg-muted px-3 py-2 text-[12px] text-muted-foreground hover:bg-accent"
        >
          Search conditions...
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search conditions..." className="text-[12px]" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-[12px] text-muted-foreground">
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

function searchRxNames(
  query: string,
  excludeSet: Set<string>,
  limit = 20,
): typeof RX_NAMES[number][] {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []

  const startsWithResults: typeof RX_NAMES[number][] = []
  const containsResults: typeof RX_NAMES[number][] = []

  for (const rx of RX_NAMES) {
    if (excludeSet.has(rx.n.toLowerCase())) continue
    const lower = rx.n.toLowerCase()
    if (lower.startsWith(q)) {
      startsWithResults.push(rx)
      if (startsWithResults.length + containsResults.length >= limit) break
    } else if (lower.includes(q)) {
      containsResults.push(rx)
      if (startsWithResults.length + containsResults.length >= limit) break
    }
  }

  return [...startsWithResults, ...containsResults].slice(0, limit)
}

function MedicationCombobox({
  selectedMedications,
  onSelect,
}: {
  selectedMedications: string[]
  onSelect: (medication: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedSet = useMemo(
    () => new Set(selectedMedications.map((m) => m.toLowerCase())),
    [selectedMedications],
  )

  const results = useMemo(
    () => searchRxNames(search, selectedSet),
    [search, selectedSet],
  )

  return (
    <Popover open={open} onOpenChange={(v) => {
      setOpen(v)
      if (!v) setSearch("")
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1.5 flex w-full items-center justify-between rounded-sm border border-border bg-muted px-3 py-2 text-[12px] text-muted-foreground hover:bg-accent"
        >
          Search medications...
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search medications..."
            className="text-[12px]"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[200px]">
            {search.length < 2 ? (
              <div className="py-3 text-center text-[12px] text-muted-foreground">
                Type at least 2 characters...
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty className="py-3 text-center text-[12px] text-muted-foreground">
                No medications found.
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((rx) => (
                  <CommandItem
                    key={rx.n}
                    value={rx.n}
                    onSelect={() => {
                      onSelect(rx.n)
                      setSearch("")
                      setOpen(false)
                    }}
                    className="text-[12px]"
                  >
                    <div className="flex flex-col">
                      <span>{rx.n}</span>
                      {rx.c && (
                        <span className="text-[10px] text-muted-foreground">{rx.c}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function MedicalHistorySection({
  selectedConditions,
  onConditionsChange,
  selectedMedications,
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

  const handleAddMedication = (medication: string) => {
    const alreadySelected = selectedMedications.some(
      (m) => m.toLowerCase() === medication.toLowerCase(),
    )
    if (!alreadySelected) {
      onMedicationsChange([...selectedMedications, medication])
    }
  }

  const handleRemoveMedication = (medication: string) => {
    const lower = medication.toLowerCase()
    onMedicationsChange(
      selectedMedications.filter((m) => m.toLowerCase() !== lower),
    )
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
              className="mt-1.5 rounded-sm border-border bg-muted text-[12px] text-foreground"
            />
          </div>
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
                  className="inline-flex items-center gap-1 rounded-sm border border-border bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground"
                >
                  {condition?.label ?? conditionId}
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(conditionId)}
                    className="ml-0.5 text-muted-foreground hover:text-accent-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      {/* Medications Combobox */}
      <div>
        <div className="flex items-center gap-2">
          <FieldLabel>Medications</FieldLabel>
          {selectedMedications.length > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1773cf] px-1 text-[9px] font-bold text-white">
              {selectedMedications.length}
            </span>
          )}
        </div>
        <MedicationCombobox
          selectedMedications={selectedMedications}
          onSelect={handleAddMedication}
        />

        {selectedMedications.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedMedications.map((medication) => (
              <Badge
                key={medication}
                variant="secondary"
                className="inline-flex items-center gap-1 rounded-sm border border-border bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground"
              >
                {medication}
                <button
                  type="button"
                  onClick={() => handleRemoveMedication(medication)}
                  className="ml-0.5 text-muted-foreground hover:text-accent-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
