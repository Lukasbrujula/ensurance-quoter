"use client"

import { useCallback, useEffect, useRef } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Settings, LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { MedicalHistorySection } from "@/components/quote/medical-history-section"
import { useLeadStore } from "@/lib/store/lead-store"
import type { Lead } from "@/lib/types/lead"
import type { QuoteRequest } from "@/lib/types"

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
] as const

const intakeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().int().min(18, "Minimum age is 18").max(85, "Maximum age is 85"),
  gender: z.enum(["Male", "Female"]),
  state: z.string().min(1, "State is required"),
  coverageAmount: z.number().min(100000).max(10000000),
  termLength: z.enum(["10", "15", "20", "25", "30", "35", "40"]),
  tobaccoStatus: z.enum(["non-smoker", "smoker"]),
  heightFeet: z.number().int().min(3).max(7).optional(),
  heightInches: z.number().int().min(0).max(11).optional(),
  weight: z.number().min(50).max(500).optional(),
  medicalConditions: z.array(z.string()).optional(),
  medications: z.string().optional(),
  duiHistory: z.boolean().optional(),
  yearsSinceLastDui: z.number().int().min(0).max(50).optional(),
})

type IntakeFormValues = z.infer<typeof intakeSchema>

const COVERAGE_STEPS = [
  100000, 150000, 200000, 250000, 300000, 400000, 500000, 750000,
  1000000, 1500000, 2000000, 2500000, 3000000, 4000000, 5000000,
  6000000, 7500000, 10000000,
] as const

function formatCoverage(amount: number): string {
  if (amount >= 1000000) {
    const millions = amount / 1000000
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`
  }
  return `$${(amount / 1000).toFixed(0)}K`
}

function coverageToSlider(amount: number): number {
  const index = COVERAGE_STEPS.findIndex((step) => step >= amount)
  return index === -1 ? COVERAGE_STEPS.length - 1 : index
}

function sliderToCoverage(index: number): number {
  return COVERAGE_STEPS[Math.round(index)] ?? COVERAGE_STEPS[0]
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-[0.5px]">
      {children}
    </label>
  )
}

const EMPTY_DEFAULTS: IntakeFormValues = {
  name: "",
  age: 45,
  gender: "Male",
  state: "",
  coverageAmount: 250000,
  termLength: "20",
  tobaccoStatus: "non-smoker",
  heightFeet: undefined,
  heightInches: undefined,
  weight: undefined,
  medicalConditions: [],
  medications: "",
  duiHistory: false,
  yearsSinceLastDui: undefined,
}

function calculateBMIDisplay(
  heightFeet: number | undefined,
  heightInches: number | undefined,
  weight: number | undefined,
): string | null {
  if (heightFeet === undefined || heightInches === undefined || weight === undefined) {
    return null
  }
  const totalInches = heightFeet * 12 + heightInches
  if (totalInches === 0) return null
  const bmi = (weight * 703) / (totalInches * totalInches)
  return bmi.toFixed(1)
}

function buildFormValuesFromLead(lead: Lead): IntakeFormValues {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ")
  return {
    name: name || EMPTY_DEFAULTS.name,
    age: lead.age ?? EMPTY_DEFAULTS.age,
    gender: lead.gender ?? EMPTY_DEFAULTS.gender,
    state: lead.state ?? EMPTY_DEFAULTS.state,
    coverageAmount: lead.coverageAmount ?? EMPTY_DEFAULTS.coverageAmount,
    termLength: lead.termLength
      ? (String(lead.termLength) as IntakeFormValues["termLength"])
      : EMPTY_DEFAULTS.termLength,
    tobaccoStatus: lead.tobaccoStatus ?? EMPTY_DEFAULTS.tobaccoStatus,
    heightFeet: lead.heightFeet ?? undefined,
    heightInches: lead.heightInches ?? undefined,
    weight: lead.weight ?? undefined,
    medicalConditions: lead.medicalConditions ?? [],
    medications: "",
    duiHistory: lead.duiHistory,
    yearsSinceLastDui: lead.yearsSinceLastDui ?? undefined,
  }
}

function BuildSection({
  form,
}: {
  form: ReturnType<typeof useForm<IntakeFormValues>>
}) {
  const watchedFeet = form.watch("heightFeet")
  const watchedInches = form.watch("heightInches")
  const watchedWeight = form.watch("weight")
  const bmi = calculateBMIDisplay(watchedFeet, watchedInches, watchedWeight)

  return (
    <div>
      <div className="flex items-center justify-between">
        <FieldLabel>Height / Weight</FieldLabel>
        {bmi && (
          <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-bold ${
            Number(bmi) < 25
              ? "border-[#bbf7d0] bg-[#dcfce7] text-[#16a34a]"
              : Number(bmi) < 30
                ? "border-[#fed7aa] bg-[#ffedd5] text-[#ea580c]"
                : "border-[#fecaca] bg-[#fee2e2] text-[#dc2626]"
          }`}>
            BMI {bmi}
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        {/* Height: feet */}
        <FormField
          control={form.control}
          name="heightFeet"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Select
                  onValueChange={(val) => {
                    field.onChange(Number(val))
                  }}
                  value={field.value !== undefined ? String(field.value) : ""}
                >
                  <SelectTrigger className="rounded-sm border-border bg-muted text-[13px] font-medium text-foreground">
                    <SelectValue placeholder="Ft" />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7].map((ft) => (
                      <SelectItem key={ft} value={String(ft)}>
                        {ft} ft
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Height: inches */}
        <FormField
          control={form.control}
          name="heightInches"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Select
                  onValueChange={(val) => {
                    field.onChange(Number(val))
                  }}
                  value={field.value !== undefined ? String(field.value) : ""}
                >
                  <SelectTrigger className="rounded-sm border-border bg-muted text-[13px] font-medium text-foreground">
                    <SelectValue placeholder="In" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((inch) => (
                      <SelectItem key={inch} value={String(inch)}>
                        {inch} in
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Weight */}
        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem className="flex-[1.2]">
              <FormControl>
                <Input
                  type="number"
                  placeholder="lbs"
                  className="rounded-sm border-border bg-muted text-[13px] font-medium text-foreground"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value
                    field.onChange(val ? Number(val) : undefined)
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}

interface IntakeFormProps {
  onSubmit: (data: QuoteRequest) => void
  onClear?: () => void
  isLoading?: boolean
}

export function IntakeForm({ onSubmit, onClear, isLoading = false }: IntakeFormProps) {
  const { user } = useAuth()
  const activeLead = useLeadStore((s) => s.activeLead)
  const autoFillVersion = useLeadStore((s) => s.autoFillVersion)
  const markFieldDirty = useLeadStore((s) => s.markFieldDirty)
  const lastLeadIdRef = useRef<string | null>(null)
  const lastAutoFillRef = useRef(0)

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: activeLead ? buildFormValuesFromLead(activeLead) : EMPTY_DEFAULTS,
  })

  // Reset form when activeLead changes
  useEffect(() => {
    const newId = activeLead?.id ?? null
    if (newId === lastLeadIdRef.current) return
    lastLeadIdRef.current = newId

    if (activeLead) {
      form.reset(buildFormValuesFromLead(activeLead))
    } else {
      form.reset(EMPTY_DEFAULTS)
    }
  }, [activeLead]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync form fields when auto-fill is applied (enrichment)
  useEffect(() => {
    if (autoFillVersion === lastAutoFillRef.current) return
    lastAutoFillRef.current = autoFillVersion
    if (!activeLead) return

    const vals = buildFormValuesFromLead(activeLead)
    const dirtyFields = useLeadStore.getState().dirtyFields
    if (vals.name && !dirtyFields.has("name")) form.setValue("name", vals.name)
    if (vals.age != null && !dirtyFields.has("age")) form.setValue("age", vals.age)
    if (vals.gender && !dirtyFields.has("gender")) form.setValue("gender", vals.gender)
    if (vals.state && !dirtyFields.has("state")) form.setValue("state", vals.state)
  }, [autoFillVersion, activeLead]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormSubmit = useCallback(
    (values: IntakeFormValues) => {
      const request: QuoteRequest = {
        name: values.name,
        age: values.age,
        gender: values.gender,
        state: values.state,
        coverageAmount: values.coverageAmount,
        termLength: Number(values.termLength) as QuoteRequest["termLength"],
        tobaccoStatus: values.tobaccoStatus,
        heightFeet: values.heightFeet,
        heightInches: values.heightInches,
        weight: values.weight,
        medicalConditions: values.medicalConditions ?? [],
        medications: values.medications || undefined,
        duiHistory: values.duiHistory ?? false,
        yearsSinceLastDui: values.duiHistory
          ? (values.yearsSinceLastDui ?? null)
          : null,
      }
      onSubmit(request)
    },
    [onSubmit],
  )

  const handleClear = useCallback(() => {
    form.reset()
    onClear?.()
  }, [form, onClear])

  const watchedAge = form.watch("age")

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="flex h-full flex-col"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#1773cf] shadow-sm">
              <span className="material-symbols-outlined text-white text-[24px] leading-none">
                shield_person
              </span>
            </div>
            <div>
              <p className="text-[14px] font-bold uppercase tracking-[1.4px] text-muted-foreground">
                Intake Profile
              </p>
              <p className="font-mono text-[12px] tracking-tight text-[#1773cf]">
                ID: #4920-ALPHA
              </p>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-5">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel>Full Name</FieldLabel>
                  <FormControl>
                    <Input
                      className="mt-1.5 rounded-sm border-border bg-muted text-[14px] font-medium text-foreground"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e)
                        markFieldDirty("name")
                        markFieldDirty("firstName")
                        markFieldDirty("lastName")
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Age + Gender row */}
            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FieldLabel>Age</FieldLabel>
                    <FormControl>
                      <div className="mt-1.5 flex items-center rounded-sm border border-border bg-muted">
                        <button
                          type="button"
                          className="border-r border-border px-2 py-1 text-[16px] text-muted-foreground hover:bg-muted"
                          onClick={() => {
                            field.onChange(Math.max(18, field.value - 1))
                            markFieldDirty("age")
                          }}
                        >
                          -
                        </button>
                        <div className="flex-1 text-center text-[14px] font-bold text-foreground tabular-nums">
                          {watchedAge}
                        </div>
                        <button
                          type="button"
                          className="border-l border-border px-2 py-1 text-[16px] text-muted-foreground hover:bg-muted"
                          onClick={() => {
                            field.onChange(Math.min(85, field.value + 1))
                            markFieldDirty("age")
                          }}
                        >
                          +
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FieldLabel>Gender</FieldLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val)
                        markFieldDirty("gender")
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="mt-1.5 rounded-sm border-border bg-muted text-[14px] font-medium text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* State */}
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel>State / Territory</FieldLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val)
                      markFieldDirty("state")
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="mt-1.5 rounded-sm border-border bg-muted text-[14px] font-medium text-foreground">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tobacco Usage */}
            <FormField
              control={form.control}
              name="tobaccoStatus"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel>Tobacco Usage</FieldLabel>
                  <FormControl>
                    <div className="mt-1.5 flex rounded-sm border border-border bg-muted overflow-hidden">
                      <button
                        type="button"
                        className={`flex-1 py-2 text-[12px] font-bold uppercase transition-colors ${
                          field.value === "non-smoker"
                            ? "bg-[#1773cf] text-white"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => {
                          field.onChange("non-smoker")
                        }}
                      >
                        Non-Smoker
                      </button>
                      <button
                        type="button"
                        className={`flex-1 border-l border-border py-2 text-[12px] font-bold uppercase transition-colors ${
                          field.value === "smoker"
                            ? "bg-[#1773cf] text-white"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => {
                          field.onChange("smoker")
                        }}
                      >
                        Smoker
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Height / Weight (Build Chart) */}
            <BuildSection
              form={form}
            />

            {/* Medical History */}
            <Separator className="my-1" />
            <MedicalHistorySection
              selectedConditions={form.watch("medicalConditions") ?? []}
              onConditionsChange={(conditions) => {
                form.setValue("medicalConditions", conditions)
              }}
              medications={form.watch("medications") ?? ""}
              onMedicationsChange={(value) => {
                form.setValue("medications", value)
              }}
              duiHistory={form.watch("duiHistory") ?? false}
              onDuiHistoryChange={(value) => {
                form.setValue("duiHistory", value)
                if (!value) {
                  form.setValue("yearsSinceLastDui", undefined)
                }
              }}
              yearsSinceLastDui={form.watch("yearsSinceLastDui")}
              onYearsSinceLastDuiChange={(value) => {
                form.setValue("yearsSinceLastDui", value)
              }}
            />

            {/* Clear Quote + Get Quotes Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                className="flex-1 rounded-sm border-border py-2.5 text-[12px] font-bold uppercase tracking-[0.5px] text-muted-foreground hover:bg-muted"
              >
                Clear Quote
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-[2] rounded-sm bg-[#1773cf] py-2.5 text-[12px] font-bold uppercase tracking-[0.5px] text-white shadow-[0px_4px_6px_-1px_rgba(59,130,246,0.2)] hover:bg-[#1566b8] disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Quoting...
                  </>
                ) : (
                  "Get Quotes"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Agent Card */}
        <div className="mt-auto border-t border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-[#e2e8f0]">
              <div className="flex h-full w-full items-center justify-center bg-[#1e293b] text-[12px] font-bold text-white">
                {(() => {
                  const first = (user?.user_metadata?.first_name as string) ?? ""
                  const last = (user?.user_metadata?.last_name as string) ?? ""
                  if (first && last) return `${first[0]}${last[0]}`.toUpperCase()
                  if (first) return first.slice(0, 2).toUpperCase()
                  return (user?.email ?? "").slice(0, 2).toUpperCase()
                })()}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                {(() => {
                  const first = (user?.user_metadata?.first_name as string) ?? ""
                  const last = (user?.user_metadata?.last_name as string) ?? ""
                  if (first || last) return [first, last].filter(Boolean).join(" ")
                  return user?.email ?? "Agent"
                })()}
              </p>
              <p className="text-[11px] text-muted-foreground/70">{user?.email ?? ""}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1 rounded-sm border border-border bg-muted py-2 text-muted-foreground hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1 rounded-sm border border-border bg-muted py-2 text-muted-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </Form>
  )
}
