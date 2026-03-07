"use client"

import { useState, useMemo } from "react"
import { ChevronsUpDown, X, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
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

export interface AdvancedUnderwritingFields {
  systolic?: number
  diastolic?: number
  bpMedication?: boolean
  cholesterolLevel?: number
  hdlRatio?: number
  cholesterolMedication?: boolean
  familyHeartDisease?: boolean
  familyCancer?: boolean
  alcoholHistory?: boolean
  alcoholYearsSince?: number
  drugHistory?: boolean
  drugYearsSince?: number
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
  advancedFields?: AdvancedUnderwritingFields
  onAdvancedFieldsChange?: (fields: AdvancedUnderwritingFields) => void
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
  advancedFields,
  onAdvancedFieldsChange,
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

      {/* Advanced Underwriting Fields */}
      {onAdvancedFieldsChange && (
        <AdvancedUnderwritingSection
          fields={advancedFields ?? {}}
          onChange={onAdvancedFieldsChange}
        />
      )}
    </div>
  )
}

function AdvancedUnderwritingSection({
  fields,
  onChange,
}: {
  fields: AdvancedUnderwritingFields
  onChange: (fields: AdvancedUnderwritingFields) => void
}) {
  const [open, setOpen] = useState(false)

  const filledCount = [
    fields.systolic,
    fields.diastolic,
    fields.cholesterolLevel,
    fields.hdlRatio,
    fields.alcoholHistory,
    fields.drugHistory,
    fields.familyHeartDisease,
    fields.familyCancer,
  ].filter((v) => v !== undefined && v !== false).length

  const updateField = <K extends keyof AdvancedUnderwritingFields>(
    key: K,
    value: AdvancedUnderwritingFields[K],
  ) => {
    onChange({ ...fields, [key]: value })
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold text-foreground">
              Advanced Underwriting
            </p>
            {filledCount > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1773cf] px-1 text-[9px] font-bold text-white">
                {filledCount}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-4 rounded-md border border-border bg-muted/10 px-3 py-3">
          <p className="text-[10px] text-muted-foreground">
            Optional health details for more accurate carrier pre-qualification via Compulife Health Analyzer.
          </p>

          {/* Blood Pressure */}
          <div className="space-y-2">
            <FieldLabel>Blood Pressure</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground">Systolic</label>
                <Input
                  type="number"
                  min={70}
                  max={250}
                  placeholder="120"
                  value={fields.systolic ?? ""}
                  onChange={(e) =>
                    updateField("systolic", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className="rounded-sm border-border bg-muted text-[12px] text-foreground h-8"
                />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">Diastolic</label>
                <Input
                  type="number"
                  min={40}
                  max={150}
                  placeholder="80"
                  value={fields.diastolic ?? ""}
                  onChange={(e) =>
                    updateField("diastolic", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className="rounded-sm border-border bg-muted text-[12px] text-foreground h-8"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">On BP medication?</label>
              <Switch
                checked={fields.bpMedication ?? false}
                onCheckedChange={(v) => updateField("bpMedication", v)}
                className="data-[state=checked]:bg-[#1773cf] scale-90"
              />
            </div>
          </div>

          {/* Cholesterol */}
          <div className="space-y-2">
            <FieldLabel>Cholesterol</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground">Total Level</label>
                <Input
                  type="number"
                  min={100}
                  max={400}
                  placeholder="200"
                  value={fields.cholesterolLevel ?? ""}
                  onChange={(e) =>
                    updateField("cholesterolLevel", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className="rounded-sm border-border bg-muted text-[12px] text-foreground h-8"
                />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">HDL Ratio</label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  step={0.1}
                  placeholder="4.0"
                  value={fields.hdlRatio ?? ""}
                  onChange={(e) =>
                    updateField("hdlRatio", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className="rounded-sm border-border bg-muted text-[12px] text-foreground h-8"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">On cholesterol medication?</label>
              <Switch
                checked={fields.cholesterolMedication ?? false}
                onCheckedChange={(v) => updateField("cholesterolMedication", v)}
                className="data-[state=checked]:bg-[#1773cf] scale-90"
              />
            </div>
          </div>

          {/* Family History */}
          <div className="space-y-2">
            <FieldLabel>Family History</FieldLabel>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">
                Parent died of heart disease before 60?
              </label>
              <Switch
                checked={fields.familyHeartDisease ?? false}
                onCheckedChange={(v) => updateField("familyHeartDisease", v)}
                className="data-[state=checked]:bg-[#1773cf] scale-90"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">
                Parent died of cancer before 60?
              </label>
              <Switch
                checked={fields.familyCancer ?? false}
                onCheckedChange={(v) => updateField("familyCancer", v)}
                className="data-[state=checked]:bg-[#1773cf] scale-90"
              />
            </div>
          </div>

          {/* Substance History */}
          <div className="space-y-2">
            <FieldLabel>Substance History</FieldLabel>
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">Alcohol treatment history?</label>
              <Switch
                checked={fields.alcoholHistory ?? false}
                onCheckedChange={(v) => {
                  const updated = { ...fields, alcoholHistory: v }
                  if (!v) updated.alcoholYearsSince = undefined
                  onChange(updated)
                }}
                className="data-[state=checked]:bg-[#1773cf] scale-90"
              />
            </div>
            {fields.alcoholHistory && (
              <div>
                <label className="text-[9px] text-muted-foreground">Years since treatment</label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  placeholder="5"
                  value={fields.alcoholYearsSince ?? ""}
                  onChange={(e) =>
                    updateField("alcoholYearsSince", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className="rounded-sm border-border bg-muted text-[12px] text-foreground h-8"
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">Drug treatment history?</label>
              <Switch
                checked={fields.drugHistory ?? false}
                onCheckedChange={(v) => {
                  const updated = { ...fields, drugHistory: v }
                  if (!v) updated.drugYearsSince = undefined
                  onChange(updated)
                }}
                className="data-[state=checked]:bg-[#1773cf] scale-90"
              />
            </div>
            {fields.drugHistory && (
              <div>
                <label className="text-[9px] text-muted-foreground">Years since treatment</label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  placeholder="5"
                  value={fields.drugYearsSince ?? ""}
                  onChange={(e) =>
                    updateField("drugYearsSince", e.target.value === "" ? undefined : Number(e.target.value))
                  }
                  className="rounded-sm border-border bg-muted text-[12px] text-foreground h-8"
                />
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
