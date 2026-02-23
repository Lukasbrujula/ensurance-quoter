"use client"

import { useState, useCallback } from "react"
import {
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  StickyNote,
  CalendarClock,
  Activity,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useLeadStore } from "@/lib/store/lead-store"
import { FollowUpScheduler } from "@/components/leads/follow-up-scheduler"
import { ActivityTimeline } from "@/components/leads/activity-timeline"
import type { MaritalStatus, IncomeRange } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "domestic_partner", label: "Domestic Partner" },
]

const INCOME_OPTIONS: { value: IncomeRange; label: string }[] = [
  { value: "under_25k", label: "Under $25K" },
  { value: "25k_50k", label: "$25K - $50K" },
  { value: "50k_75k", label: "$50K - $75K" },
  { value: "75k_100k", label: "$75K - $100K" },
  { value: "100k_150k", label: "$100K - $150K" },
  { value: "150k_250k", label: "$150K - $250K" },
  { value: "over_250k", label: "$250K+" },
]

const NOTES_MAX = 5000

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase text-[#64748b] tracking-[0.5px]">
      {children}
    </label>
  )
}

function calculateAgeFromDob(dob: string): number | null {
  const date = new Date(dob)
  if (isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age--
  }
  return age
}

/* ------------------------------------------------------------------ */
/*  Collapsible section wrapper                                        */
/* ------------------------------------------------------------------ */

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  defaultExpanded?: boolean
  children: React.ReactNode
  badge?: string | null
}

function CollapsibleSection({
  icon: Icon,
  label,
  defaultExpanded = false,
  children,
  badge,
}: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between py-1"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-[#94a3b8]" />
          <span className="text-[10px] font-bold uppercase text-[#64748b] tracking-[0.5px]">
            {label}
          </span>
          {badge && (
            <span className="rounded-sm bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold text-[#1773cf]">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-[#94a3b8]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
        )}
      </button>
      {expanded && <div className="mt-2 flex flex-col gap-3">{children}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Lead Details Section                                               */
/* ------------------------------------------------------------------ */

export function LeadDetailsSection() {
  const activeLead = useLeadStore((s) => s.activeLead)
  const updateActiveLead = useLeadStore((s) => s.updateActiveLead)
  const markFieldDirty = useLeadStore((s) => s.markFieldDirty)

  const handleChange = useCallback(
    (field: string, value: string | number | null) => {
      updateActiveLead({ [field]: value })
      markFieldDirty(field)
    },
    [updateActiveLead, markFieldDirty],
  )

  if (!activeLead) return null

  const dobAge = activeLead.dateOfBirth
    ? calculateAgeFromDob(activeLead.dateOfBirth)
    : null

  const personalBadge = [
    activeLead.dateOfBirth,
    activeLead.address,
    activeLead.city,
    activeLead.zipCode,
    activeLead.maritalStatus,
  ].filter(Boolean).length > 0
    ? `${[activeLead.dateOfBirth, activeLead.address, activeLead.city, activeLead.zipCode, activeLead.maritalStatus].filter(Boolean).length}/5`
    : null

  const financialBadge = [
    activeLead.occupation,
    activeLead.incomeRange,
    activeLead.dependents != null ? String(activeLead.dependents) : null,
    activeLead.existingCoverage,
  ].filter(Boolean).length > 0
    ? `${[activeLead.occupation, activeLead.incomeRange, activeLead.dependents != null ? String(activeLead.dependents) : null, activeLead.existingCoverage].filter(Boolean).length}/4`
    : null

  const handleFollowUpSave = useCallback(
    (date: string, note: string | null) => {
      updateActiveLead({ followUpDate: date, followUpNote: note })
      markFieldDirty("followUpDate")
      markFieldDirty("followUpNote")
    },
    [updateActiveLead, markFieldDirty],
  )

  const handleFollowUpClear = useCallback(() => {
    updateActiveLead({ followUpDate: null, followUpNote: null })
    markFieldDirty("followUpDate")
    markFieldDirty("followUpNote")
  }, [updateActiveLead, markFieldDirty])

  return (
    <div className="flex flex-col gap-4 px-6 pb-4">
      <Separator />

      {/* Follow-Up */}
      <CollapsibleSection
        icon={CalendarClock}
        label="Follow-Up"
        defaultExpanded={activeLead.followUpDate !== null}
        badge={activeLead.followUpDate ? "Scheduled" : null}
      >
        <FollowUpScheduler
          followUpDate={activeLead.followUpDate}
          followUpNote={activeLead.followUpNote}
          onSave={handleFollowUpSave}
          onClear={handleFollowUpClear}
        />
      </CollapsibleSection>

      {/* Personal Details */}
      <CollapsibleSection
        icon={User}
        label="Personal Details"
        badge={personalBadge}
      >
        {/* Date of Birth */}
        <div>
          <FieldLabel>Date of Birth</FieldLabel>
          <div className="mt-1.5 flex items-center gap-2">
            <Input
              type="date"
              className="flex-1 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a]"
              value={activeLead.dateOfBirth ?? ""}
              onChange={(e) => {
                const val = e.target.value || null
                handleChange("dateOfBirth", val)
                // Auto-update age when DOB is set
                if (val) {
                  const age = calculateAgeFromDob(val)
                  if (age !== null && age >= 0) {
                    updateActiveLead({ age })
                  }
                }
              }}
            />
            {dobAge !== null && (
              <span className="shrink-0 rounded-sm border border-[#e2e8f0] bg-[#f1f5f9] px-2 py-1 text-[11px] font-bold text-[#475569]">
                Age {dobAge}
              </span>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <FieldLabel>Address</FieldLabel>
          <Input
            className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a]"
            placeholder="Street address"
            value={activeLead.address ?? ""}
            onChange={(e) => handleChange("address", e.target.value || null)}
          />
        </div>

        {/* City + Zip */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>City</FieldLabel>
            <Input
              className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a]"
              placeholder="City"
              value={activeLead.city ?? ""}
              onChange={(e) => handleChange("city", e.target.value || null)}
            />
          </div>
          <div>
            <FieldLabel>Zip Code</FieldLabel>
            <Input
              className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a]"
              placeholder="12345"
              value={activeLead.zipCode ?? ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^\d-]/g, "").slice(0, 10)
                handleChange("zipCode", val || null)
              }}
            />
          </div>
        </div>

        {/* Marital Status */}
        <div>
          <FieldLabel>Marital Status</FieldLabel>
          <Select
            value={activeLead.maritalStatus ?? ""}
            onValueChange={(val) =>
              handleChange("maritalStatus", val || null)
            }
          >
            <SelectTrigger className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {MARITAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleSection>

      {/* Financial & Professional */}
      <CollapsibleSection
        icon={Briefcase}
        label="Financial & Professional"
        badge={financialBadge}
      >
        {/* Occupation */}
        <div>
          <FieldLabel>Occupation</FieldLabel>
          <Input
            className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a]"
            placeholder="Job title"
            value={activeLead.occupation ?? ""}
            onChange={(e) => handleChange("occupation", e.target.value || null)}
          />
        </div>

        {/* Income Range */}
        <div>
          <FieldLabel>Income Range</FieldLabel>
          <Select
            value={activeLead.incomeRange ?? ""}
            onValueChange={(val) =>
              handleChange("incomeRange", val || null)
            }
          >
            <SelectTrigger className="mt-1.5 rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {INCOME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dependents */}
        <div>
          <FieldLabel>Dependents</FieldLabel>
          <div className="mt-1.5 flex items-center rounded-sm border border-[#e2e8f0] bg-[#f9fafb]">
            <button
              type="button"
              className="border-r border-[#e2e8f0] px-2 py-1 text-[16px] text-[#64748b] hover:bg-[#f1f5f9]"
              onClick={() =>
                handleChange(
                  "dependents",
                  Math.max(0, (activeLead.dependents ?? 0) - 1),
                )
              }
            >
              -
            </button>
            <div className="flex-1 text-center text-[14px] font-bold text-[#0f172a] tabular-nums">
              {activeLead.dependents ?? 0}
            </div>
            <button
              type="button"
              className="border-l border-[#e2e8f0] px-2 py-1 text-[16px] text-[#64748b] hover:bg-[#f1f5f9]"
              onClick={() =>
                handleChange(
                  "dependents",
                  Math.min(20, (activeLead.dependents ?? 0) + 1),
                )
              }
            >
              +
            </button>
          </div>
        </div>

        {/* Existing Coverage */}
        <div>
          <FieldLabel>Existing Coverage</FieldLabel>
          <Textarea
            className="mt-1.5 min-h-[60px] rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a] resize-y"
            placeholder="e.g., $200K group through employer"
            value={activeLead.existingCoverage ?? ""}
            onChange={(e) =>
              handleChange("existingCoverage", e.target.value || null)
            }
          />
        </div>
      </CollapsibleSection>

      {/* Notes */}
      <CollapsibleSection
        icon={StickyNote}
        label="Notes"
        badge={activeLead.notes ? "Has notes" : null}
      >
        <div>
          <Textarea
            className="min-h-[100px] rounded-sm border-[#e2e8f0] bg-[#f9fafb] text-[13px] font-medium text-[#0f172a] resize-y"
            placeholder="Agent notes about this lead..."
            maxLength={NOTES_MAX}
            value={activeLead.notes ?? ""}
            onChange={(e) => handleChange("notes", e.target.value || null)}
          />
          <div className="mt-1 text-right text-[10px] text-[#94a3b8]">
            {(activeLead.notes ?? "").length}/{NOTES_MAX}
          </div>
        </div>
      </CollapsibleSection>

      {/* Activity Timeline */}
      <CollapsibleSection
        icon={Activity}
        label="Activity"
      >
        <ActivityTimeline leadId={activeLead.id} />
      </CollapsibleSection>
    </div>
  )
}
