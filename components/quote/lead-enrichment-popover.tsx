"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Search,
  User,
  MapPin,
  Briefcase,
  DollarSign,
  Loader2,
  GraduationCap,
  History,
  Sparkles,
  Globe,
  Phone,
  Mail,
  BarChart3,
  Award,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useLeadStore } from "@/lib/store/lead-store"
import type {
  EnrichmentResult,
  EnrichmentResponse,
  EnrichmentAutoFillData,
  IncomeRange,
} from "@/lib/types"
import type { Lead } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Props & helpers                                                    */
/* ------------------------------------------------------------------ */

interface LeadEnrichmentPopoverProps {
  onEnrichmentResult: (result: EnrichmentResult) => void
  onAutoFill: (data: EnrichmentAutoFillData) => number
  onSendToChat?: (text: string) => void
}

function mapSexToGender(sex: string | null): "Male" | "Female" | undefined {
  if (!sex) return undefined
  const lower = sex.toLowerCase()
  if (lower === "male") return "Male"
  if (lower === "female") return "Female"
  return undefined
}

/**
 * Map PDL's inferredSalary string to our IncomeRange enum.
 * PDL returns values like "very high", "high", "mid", "low", "very low".
 */
function mapSalaryToIncomeRange(salary: string | null): IncomeRange | undefined {
  if (!salary) return undefined
  const lower = salary.toLowerCase().trim()
  if (lower === "very high" || lower === "highest") return "over_250k"
  if (lower === "high") return "150k_250k"
  if (lower === "mid" || lower === "medium") return "75k_100k"
  if (lower === "low") return "25k_50k"
  if (lower === "very low" || lower === "lowest") return "under_25k"
  return undefined
}

/**
 * Convert PDL birth data to an ISO date string.
 * - If birthDate exists (e.g. "1988-03-15"), use it directly.
 * - If only birthYear, use mid-year estimate: "1988-06-15".
 */
function mapBirthToDateOfBirth(
  birthDate: string | null,
  birthYear: number | null,
): string | undefined {
  if (birthDate) {
    // Validate ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return birthDate
  }
  if (birthYear && birthYear > 1900 && birthYear < 2100) {
    return `${birthYear}-06-15`
  }
  return undefined
}

/**
 * Normalize PDL zip to 5 digits.
 */
function normalizeZip(zip: string | null): string | undefined {
  if (!zip) return undefined
  const match = zip.replace(/\s/g, "").match(/^(\d{5})/)
  return match ? match[1] : undefined
}

/** Human-readable labels for income ranges */
const INCOME_LABELS: Record<IncomeRange, string> = {
  under_25k: "Under $25K",
  "25k_50k": "$25K-$50K",
  "50k_75k": "$50K-$75K",
  "75k_100k": "$75K-$100K",
  "100k_150k": "$100K-$150K",
  "150k_250k": "$150K-$250K",
  over_250k: "Over $250K",
}

/* ------------------------------------------------------------------ */
/*  Extract all mappable fields from enrichment result                  */
/* ------------------------------------------------------------------ */

interface MappableField {
  key: keyof EnrichmentAutoFillData
  label: string
  pdlValue: string        // Human-readable display value
  leadValue: string | null // Current lead value (null if empty)
  autoFillValue: EnrichmentAutoFillData[keyof EnrichmentAutoFillData]
}

function extractMappableFields(
  result: EnrichmentResult,
  lead: Lead | null,
): MappableField[] {
  const fields: MappableField[] = []

  const firstName = result.firstName ?? undefined
  if (firstName) {
    fields.push({
      key: "firstName",
      label: "First Name",
      pdlValue: firstName,
      leadValue: lead?.firstName ?? null,
      autoFillValue: firstName,
    })
  }

  const lastName = result.lastName ?? undefined
  if (lastName) {
    fields.push({
      key: "lastName",
      label: "Last Name",
      pdlValue: lastName,
      leadValue: lead?.lastName ?? null,
      autoFillValue: lastName,
    })
  }

  const gender = mapSexToGender(result.sex)
  if (gender) {
    fields.push({
      key: "gender",
      label: "Gender",
      pdlValue: gender,
      leadValue: lead?.gender ?? null,
      autoFillValue: gender,
    })
  }

  const dob = mapBirthToDateOfBirth(result.birthDate, result.birthYear)
  if (dob) {
    fields.push({
      key: "dateOfBirth",
      label: "Date of Birth",
      pdlValue: result.birthDate
        ? result.birthDate
        : `~${result.birthYear} (mid-year estimate)`,
      leadValue: lead?.dateOfBirth ?? null,
      autoFillValue: dob,
    })
  }

  // Age: derive from DOB if available, otherwise use PDL's age
  const age = result.age ?? undefined
  if (age != null) {
    fields.push({
      key: "age",
      label: "Age",
      pdlValue: `${result.ageEstimated ? "~" : ""}${age}`,
      leadValue: lead?.age != null ? String(lead.age) : null,
      autoFillValue: age,
    })
  }

  const state = result.state ?? undefined
  if (state) {
    fields.push({
      key: "state",
      label: "State",
      pdlValue: state,
      leadValue: lead?.state ?? null,
      autoFillValue: state,
    })
  }

  const address = result.locationStreetAddress ?? undefined
  if (address) {
    fields.push({
      key: "address",
      label: "Address",
      pdlValue: address,
      leadValue: lead?.address ?? null,
      autoFillValue: address,
    })
  }

  const city = result.city ?? undefined
  if (city) {
    fields.push({
      key: "city",
      label: "City",
      pdlValue: city,
      leadValue: lead?.city ?? null,
      autoFillValue: city,
    })
  }

  const zipCode = normalizeZip(result.zip)
  if (zipCode) {
    fields.push({
      key: "zipCode",
      label: "Zip Code",
      pdlValue: zipCode,
      leadValue: lead?.zipCode ?? null,
      autoFillValue: zipCode,
    })
  }

  const occupation = result.jobTitle ?? undefined
  if (occupation) {
    fields.push({
      key: "occupation",
      label: "Occupation",
      pdlValue: occupation,
      leadValue: lead?.occupation ?? null,
      autoFillValue: occupation,
    })
  }

  const incomeRange = mapSalaryToIncomeRange(result.inferredSalary)
  if (incomeRange) {
    fields.push({
      key: "incomeRange",
      label: "Income Range",
      pdlValue: `${result.inferredSalary} (${INCOME_LABELS[incomeRange]})`,
      leadValue: lead?.incomeRange ? INCOME_LABELS[lead.incomeRange] : null,
      autoFillValue: incomeRange,
    })
  }

  return fields
}

/**
 * Build a structured summary of the enrichment data for the AI chat.
 */
function buildChatPayload(r: EnrichmentResult): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { rawData, ...structured } = r

  const compact = JSON.parse(
    JSON.stringify(structured, (_key, value) => {
      if (value === null) return undefined
      if (Array.isArray(value) && value.length === 0) return undefined
      if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return undefined
      return value
    }),
  )

  return [
    "Here is the full enrichment data I have on this lead:",
    "```json",
    JSON.stringify(compact, null, 2),
    "```",
    "Based on this profile, what coverage amount and term length would you recommend? Which carriers would be the best fit and why?",
  ].join("\n")
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function LeadEnrichmentPopover({
  onEnrichmentResult,
  onAutoFill,
  onSendToChat,
}: LeadEnrichmentPopoverProps) {
  const activeLead = useLeadStore((s) => s.activeLead)

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")

  // Pre-fill inputs from active lead when popover opens
  useEffect(() => {
    if (!popoverOpen || result) return
    if (!activeLead) return

    const leadName = [activeLead.firstName, activeLead.lastName].filter(Boolean).join(" ")
    if (leadName && !name) setName(leadName)
    if (activeLead.email && !email) setEmail(activeLead.email)
    if (activeLead.phone && !phone) setPhone(activeLead.phone)
    if (activeLead.city && !city) setCity(activeLead.city)
    if (activeLead.state && !state) setState(activeLead.state)
  }, [popoverOpen]) // eslint-disable-line react-hooks/exhaustive-deps
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<EnrichmentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!name.trim() && !email.trim() && !phone.trim()) return

    setIsLoading(true)
    setError(null)
    setResult(null)
    setApplied(false)

    try {
      const response = await fetch("/api/enrichment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          locality: city.trim() || undefined,
          region: state.trim() || undefined,
          profile: linkedinUrl.trim() || undefined,
        }),
      })

      const data: EnrichmentResponse = await response.json()

      if (!data.success || !data.data) {
        setError(data.error ?? "No matching person found")
        return
      }

      const enrichment = data.data
      setResult(enrichment)
      onEnrichmentResult(enrichment)

      toast.info("Lead enriched — review fields and apply to lead")

      setPopoverOpen(false)
      setDialogOpen(true)
    } catch {
      setError("Enrichment request failed")
    } finally {
      setIsLoading(false)
    }
  }, [name, email, phone, city, state, linkedinUrl, onEnrichmentResult])

  const handleReset = useCallback(() => {
    setName("")
    setEmail("")
    setPhone("")
    setCity("")
    setState("")
    setLinkedinUrl("")
    setResult(null)
    setError(null)
    setDialogOpen(false)
    setApplied(false)
  }, [])

  const handleSendToChat = useCallback(() => {
    if (!result || !onSendToChat) return
    onSendToChat(buildChatPayload(result))
  }, [result, onSendToChat])

  const handleApplyFields = useCallback(
    (data: EnrichmentAutoFillData) => {
      const filledCount = onAutoFill(data)
      setApplied(true)
      if (filledCount > 0) {
        toast.success(
          `${filledCount} field${filledCount > 1 ? "s" : ""} applied to lead`,
        )
      } else {
        toast.info("No new fields to apply — all selected fields already set")
      }
    },
    [onAutoFill],
  )

  const hasInput = name.trim() || email.trim() || phone.trim() || city.trim() || state.trim() || linkedinUrl.trim()

  return (
    <>
      {/* ── Input Popover ──────────────────────────────────────────── */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={result ? (e) => { e.preventDefault(); setDialogOpen(true) } : undefined}
            className={`flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-bold transition-colors ${
              result
                ? "bg-[#dbeafe] text-[#1773cf] hover:bg-[#bfdbfe]"
                : "text-[#1773cf] hover:bg-[#eff6ff]"
            }`}
          >
            <Search className="h-3 w-3" />
            {result ? "View Lead" : "Enrich"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="end" sideOffset={8}>
          <div className="border-b border-[#e2e8f0] px-4 py-3">
            <h4 className="text-[12px] font-bold text-[#0f172a]">Lead Enrichment</h4>
            <p className="mt-0.5 text-[10px] text-[#94a3b8]">
              Enter name, contact info, or location to find a match
            </p>
          </div>

          <div className="space-y-3 px-4 py-3">
            <LabelledInput
              icon={User}
              label="Full Name"
              value={name}
              onChange={setName}
              placeholder="John Smith"
              disabled={isLoading}
            />
            <LabelledInput
              icon={Mail}
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="john@example.com"
              type="email"
              disabled={isLoading}
            />
            <LabelledInput
              icon={Phone}
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="+1 555-123-4567"
              type="tel"
              disabled={isLoading}
            />
            <LabelledInput
              icon={MapPin}
              label="City"
              value={city}
              onChange={setCity}
              placeholder="e.g., Richmond"
              disabled={isLoading}
            />
            <LabelledInput
              icon={MapPin}
              label="State"
              value={state}
              onChange={setState}
              placeholder="e.g., Virginia"
              disabled={isLoading}
            />
            <LabelledInput
              icon={Globe}
              label="LinkedIn URL"
              value={linkedinUrl}
              onChange={setLinkedinUrl}
              placeholder="https://linkedin.com/in/..."
              type="url"
              disabled={isLoading}
            />

            <Button
              onClick={handleSubmit}
              disabled={!hasInput || isLoading}
              className="w-full bg-[#1773cf] text-[11px] font-bold hover:bg-[#1565b8]"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                  Searching...
                </>
              ) : (
                "Look Up Lead"
              )}
            </Button>
          </div>

          {error && (
            <div className="border-t border-[#e2e8f0] px-4 py-3">
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* ── Results Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[80vh] w-[500px] max-w-[90vw] flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-[#e2e8f0] px-6 py-4">
            <DialogTitle className="text-[14px] font-bold text-[#0f172a]">
              Lead Enrichment Results
            </DialogTitle>
            {result?.fullName && (
              <p className="text-[12px] text-[#64748b]">
                {result.fullName}
                {result.headline ? ` — ${result.headline}` : ""}
              </p>
            )}
          </DialogHeader>

          {result && (
            <>
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="px-6 py-2">
                  <EnrichmentAccordion result={result} />

                  {/* ── Apply to Lead section ──────────────────── */}
                  <ApplyToLeadSection
                    result={result}
                    lead={activeLead}
                    applied={applied}
                    onApply={handleApplyFields}
                  />
                </div>
              </div>

              <div className="flex shrink-0 gap-2 border-t border-[#e2e8f0] px-6 py-3">
                {onSendToChat && (
                  <Button
                    onClick={handleSendToChat}
                    size="sm"
                    className="flex-1 bg-[#1773cf] text-[11px] font-bold hover:bg-[#1565b8]"
                  >
                    <Sparkles className="mr-1.5 h-3 w-3" />
                    Send to AI
                  </Button>
                )}
                <Button onClick={handleReset} variant="ghost" size="sm" className="text-[11px]">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Apply to Lead — field selection with overwrite warnings             */
/* ------------------------------------------------------------------ */

function ApplyToLeadSection({
  result,
  lead,
  applied,
  onApply,
}: {
  result: EnrichmentResult
  lead: Lead | null
  applied: boolean
  onApply: (data: EnrichmentAutoFillData) => void
}) {
  const mappableFields = extractMappableFields(result, lead)
  const [selected, setSelected] = useState<Set<string>>(() =>
    new Set(mappableFields.map((f) => f.key)),
  )

  const toggleField = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleApply = useCallback(() => {
    const data: EnrichmentAutoFillData = {}
    for (const field of mappableFields) {
      if (!selected.has(field.key)) continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(data as any)[field.key] = field.autoFillValue
    }
    onApply(data)
  }, [mappableFields, selected, onApply])

  if (mappableFields.length === 0) {
    return (
      <div className="mt-3 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
        <p className="text-[11px] text-[#64748b]">
          No additional lead data found in enrichment results
        </p>
      </div>
    )
  }

  if (applied) {
    return (
      <div className="mt-3 rounded-md border border-[#dcfce7] bg-[#f0fdf4] px-4 py-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#16a34a]" />
          <p className="text-[11px] font-medium text-[#16a34a]">
            Fields applied to lead
          </p>
        </div>
      </div>
    )
  }

  const selectedCount = selected.size

  return (
    <div className="mt-3 rounded-md border border-[#e2e8f0] bg-[#f8fafc]">
      <div className="border-b border-[#e2e8f0] px-4 py-2.5">
        <h4 className="text-[11px] font-bold text-[#0f172a]">Apply to Lead</h4>
        <p className="text-[10px] text-[#94a3b8]">
          Select fields to populate from enrichment data
        </p>
      </div>

      <div className="divide-y divide-[#f1f5f9] px-4">
        {mappableFields.map((field) => {
          const isChecked = selected.has(field.key)
          const willOverwrite = field.leadValue != null

          return (
            <label
              key={field.key}
              className="flex cursor-pointer items-start gap-2.5 py-2"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggleField(field.key)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-medium text-[#0f172a]">
                    {field.label}
                  </span>
                  <span className="truncate text-[11px] text-[#1773cf]">
                    {field.pdlValue}
                  </span>
                </div>
                {willOverwrite && (
                  <div className="mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-[#f59e0b]" />
                    <span className="text-[10px] text-[#92400e]">
                      Overwrites: {field.leadValue}
                    </span>
                  </div>
                )}
              </div>
            </label>
          )
        })}
      </div>

      <div className="border-t border-[#e2e8f0] px-4 py-2.5">
        <Button
          onClick={handleApply}
          disabled={selectedCount === 0}
          size="sm"
          className="w-full bg-[#1773cf] text-[11px] font-bold hover:bg-[#1565b8]"
        >
          Apply {selectedCount} Field{selectedCount !== 1 ? "s" : ""} to Lead
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Accordion results display                                          */
/* ------------------------------------------------------------------ */

function EnrichmentAccordion({ result: r }: { result: EnrichmentResult }) {
  const hasIdentity = r.fullName || r.age != null || r.sex || r.nameAliases.length > 0
  const hasLocation = r.locationName || r.city || r.locationNames.length > 0 || r.streetAddresses.length > 0
  const hasCurrentRole = r.jobTitle || r.jobCompanyName
  const hasFinancial = r.inferredSalary || r.jobCompanyInferredRevenue || r.jobCompanyTicker || r.jobCompanyTotalFundingRaised != null
  const hasWorkHistory = r.experience.length > 0
  const hasEducation = r.education.length > 0
  const hasSkills = r.skills.length > 0 || r.certifications.length > 0 || r.languages.length > 0
  const hasSocial = r.linkedinUrl || r.facebookUrl || r.twitterUrl || r.githubUrl || r.profiles.length > 0
  const hasContact = r.workEmail || r.personalEmails.length > 0 || r.emails.length > 0 || r.phoneNumbers.length > 0 || r.phones.length > 0 || r.mobilePhone
  const hasMeta = r.numSources != null || r.firstSeen

  const defaultOpen = [
    hasIdentity ? "identity" : "",
    hasCurrentRole ? "current-role" : "",
    hasFinancial ? "financial" : "",
  ].filter(Boolean)

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="w-full">
      {/* Identity */}
      {hasIdentity && (
        <AccordionSection value="identity" icon={User} label="Identity">
          {r.fullName && <Row label="Full Name" value={r.fullName} />}
          {r.firstName && <Row label="First" value={r.firstName} />}
          {r.middleName && <Row label="Middle" value={r.middleName} />}
          {r.lastName && <Row label="Last" value={r.lastName} />}
          {r.age != null && (
            <Row
              label="Age"
              value={`${r.ageEstimated ? "~" : ""}${r.age}${r.birthDate ? ` (${r.birthDate})` : r.birthYear ? ` (born ${r.birthYear})` : r.ageEstimated ? " (estimated from education)" : ""}`}
            />
          )}
          {r.sex && <Row label="Gender" value={r.sex} />}
          {r.nameAliases.length > 0 && <Row label="Aliases" value={r.nameAliases.join(", ")} />}
          {r.summary && <Row label="Summary" value={r.summary} />}
        </AccordionSection>
      )}

      {/* Location */}
      {hasLocation && (
        <AccordionSection value="location" icon={MapPin} label="Location">
          {r.city && r.state && (
            <Row label="Current" value={`${r.city}, ${r.state}${r.zip ? ` ${r.zip}` : ""}`} />
          )}
          {r.locationName && (!r.city || !r.state) && <Row label="Location" value={r.locationName} />}
          {r.country && <Row label="Country" value={r.country} />}
          {r.continent && <Row label="Continent" value={r.continent} />}
          {r.locationStreetAddress && <Row label="Street" value={r.locationStreetAddress} />}
          {r.locationGeo && <Row label="Geo" value={r.locationGeo} />}
          {r.regions.length > 0 && <Row label="Known Regions" value={r.regions.join(", ")} />}
          {r.locationNames.length > 1 && <Row label="All Locations" value={r.locationNames.join("; ")} />}
          {r.streetAddresses.length > 0 && r.streetAddresses.map((a, i) => (
            <div key={`addr-${i}`} className="py-0.5 pl-5">
              <p className="text-[11px] text-[#0f172a]">{a.name ?? [a.locality, a.region, a.country].filter(Boolean).join(", ")}</p>
              {a.streetAddress && <p className="text-[10px] text-[#64748b]">{a.streetAddress}</p>}
            </div>
          ))}
        </AccordionSection>
      )}

      {/* Current Role */}
      {hasCurrentRole && (
        <AccordionSection value="current-role" icon={Briefcase} label="Current Role">
          {r.jobTitle && <Row label="Title" value={r.jobTitle} />}
          {r.jobTitleRole && <Row label="Role" value={r.jobTitleRole} />}
          {r.jobTitleSubRole && <Row label="Sub-Role" value={r.jobTitleSubRole} />}
          {r.jobTitleClass && <Row label="Class" value={r.jobTitleClass} />}
          {r.jobTitleLevels.length > 0 && <Row label="Seniority" value={r.jobTitleLevels.join(", ")} />}
          {r.jobCompanyName && <Row label="Company" value={r.jobCompanyName} />}
          {r.jobCompanyIndustry && <Row label="Industry" value={r.jobCompanyIndustry} />}
          {r.industry && r.industry !== r.jobCompanyIndustry && <Row label="Person Industry" value={r.industry} />}
          {r.jobCompanyType && <Row label="Company Type" value={r.jobCompanyType} />}
          {r.jobCompanySize && <Row label="Company Size" value={r.jobCompanySize} />}
          {r.jobCompanyEmployeeCount != null && <Row label="Employees" value={r.jobCompanyEmployeeCount.toLocaleString()} />}
          {r.jobCompanyFounded != null && <Row label="Founded" value={String(r.jobCompanyFounded)} />}
          {r.jobCompanyLocationName && <Row label="HQ" value={r.jobCompanyLocationName} />}
          {r.jobCompanyWebsite && <Row label="Website" value={r.jobCompanyWebsite} />}
          {r.jobCompanyLinkedinUrl && <Row label="Company LinkedIn" value={r.jobCompanyLinkedinUrl} />}
          {r.jobStartDate && <Row label="Start Date" value={r.jobStartDate} />}
          {r.jobLastVerified && <Row label="Last Verified" value={r.jobLastVerified} />}
          {r.jobSummary && <Row label="Summary" value={r.jobSummary} />}
          {r.inferredYearsExperience != null && <Row label="Years Experience" value={String(r.inferredYearsExperience)} />}
        </AccordionSection>
      )}

      {/* Financial Signals */}
      {hasFinancial && (
        <AccordionSection value="financial" icon={DollarSign} label="Financial Signals">
          {r.inferredSalary && <Row label="Est. Salary" value={r.inferredSalary} />}
          {r.jobCompanyInferredRevenue && <Row label="Company Revenue" value={r.jobCompanyInferredRevenue} />}
          {r.jobCompanyTotalFundingRaised != null && (
            <Row label="Total Funding" value={`$${r.jobCompanyTotalFundingRaised.toLocaleString()}`} />
          )}
          {r.jobCompanyTicker && <Row label="Ticker" value={r.jobCompanyTicker} />}
          {r.jobCompany12moGrowthRate != null && (
            <Row label="12mo Growth" value={`${(r.jobCompany12moGrowthRate * 100).toFixed(1)}%`} />
          )}
        </AccordionSection>
      )}

      {/* Work History */}
      {hasWorkHistory && (
        <AccordionSection value="work-history" icon={History} label="Work History">
          {r.experience.map((exp, i) => (
            <div key={`exp-${i}`} className="border-b border-[#f1f5f9] py-1.5 pl-5 last:border-0">
              <p className="text-[12px] font-medium text-[#0f172a]">
                {exp.title ?? "Unknown Role"}
                {exp.isPrimary && (
                  <span className="ml-1.5 rounded bg-[#dbeafe] px-1 py-0.5 text-[8px] font-bold text-[#1773cf]">
                    CURRENT
                  </span>
                )}
              </p>
              <p className="text-[11px] text-[#475569]">
                {[
                  exp.company,
                  exp.companyIndustry,
                  formatDateRange(exp.startDate, exp.endDate),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {exp.titleRole && (
                <p className="text-[10px] text-[#94a3b8]">
                  {[exp.titleRole, exp.titleSubRole].filter(Boolean).join(" / ")}
                  {exp.titleLevels.length > 0 ? ` (${exp.titleLevels.join(", ")})` : ""}
                </p>
              )}
              {exp.summary && <p className="mt-0.5 text-[10px] text-[#64748b]">{exp.summary}</p>}
            </div>
          ))}
        </AccordionSection>
      )}

      {/* Education */}
      {hasEducation && (
        <AccordionSection value="education" icon={GraduationCap} label="Education">
          {r.education.map((edu, i) => (
            <div key={`edu-${i}`} className="border-b border-[#f1f5f9] py-1.5 pl-5 last:border-0">
              <p className="text-[12px] font-medium text-[#0f172a]">
                {edu.name ?? "Unknown School"}
                {edu.type && <span className="ml-1 text-[10px] text-[#94a3b8]">({edu.type})</span>}
              </p>
              {(edu.degrees.length > 0 || edu.majors.length > 0) && (
                <p className="text-[11px] text-[#475569]">
                  {[edu.degrees.join(", "), edu.majors.length > 0 ? `in ${edu.majors.join(", ")}` : null]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              )}
              {edu.minors.length > 0 && (
                <p className="text-[10px] text-[#94a3b8]">Minor: {edu.minors.join(", ")}</p>
              )}
              {edu.gpa != null && <p className="text-[10px] text-[#94a3b8]">GPA: {edu.gpa}</p>}
              {(edu.startDate || edu.endDate) && (
                <p className="text-[10px] text-[#94a3b8]">{formatDateRange(edu.startDate, edu.endDate)}</p>
              )}
              {edu.location && <p className="text-[10px] text-[#94a3b8]">{edu.location}</p>}
            </div>
          ))}
        </AccordionSection>
      )}

      {/* Skills & Certifications */}
      {hasSkills && (
        <AccordionSection value="skills" icon={Award} label="Skills & Certifications">
          {r.skills.length > 0 && (
            <div className="py-1 pl-5">
              <p className="text-[10px] font-medium text-[#94a3b8]">Skills:</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] text-[#475569]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {r.interests.length > 0 && (
            <div className="py-1 pl-5">
              <p className="text-[10px] font-medium text-[#94a3b8]">Interests:</p>
              <p className="text-[11px] text-[#475569]">{r.interests.join(", ")}</p>
            </div>
          )}
          {r.certifications.map((cert, i) => (
            <div key={`cert-${i}`} className="py-0.5 pl-5">
              <p className="text-[11px] font-medium text-[#0f172a]">{cert.name}</p>
              {cert.organization && <p className="text-[10px] text-[#64748b]">{cert.organization}</p>}
            </div>
          ))}
          {r.languages.length > 0 && (
            <div className="py-1 pl-5">
              <p className="text-[10px] font-medium text-[#94a3b8]">Languages:</p>
              <p className="text-[11px] text-[#475569]">
                {r.languages.map((l) => l.name).filter(Boolean).join(", ")}
              </p>
            </div>
          )}
        </AccordionSection>
      )}

      {/* Social Profiles */}
      {hasSocial && (
        <AccordionSection value="social" icon={Globe} label="Social Profiles">
          {r.linkedinUrl && <Row label="LinkedIn" value={r.linkedinUrl} />}
          {r.linkedinUsername && <Row label="LinkedIn User" value={r.linkedinUsername} />}
          {r.linkedinConnections != null && <Row label="Connections" value={r.linkedinConnections.toLocaleString()} />}
          {r.facebookUrl && <Row label="Facebook" value={r.facebookUrl} />}
          {r.facebookFriends != null && <Row label="Friends" value={r.facebookFriends.toLocaleString()} />}
          {r.twitterUrl && <Row label="Twitter/X" value={r.twitterUrl} />}
          {r.githubUrl && <Row label="GitHub" value={r.githubUrl} />}
          {r.profiles
            .filter((p) => !["linkedin", "facebook", "twitter", "github"].includes(p.network?.toLowerCase() ?? ""))
            .map((p, i) => (
              <Row key={`profile-${i}`} label={p.network ?? "Profile"} value={p.url ?? p.username ?? ""} />
            ))}
        </AccordionSection>
      )}

      {/* Contact Info */}
      {hasContact && (
        <AccordionSection value="contact" icon={Phone} label="Contact Info">
          {r.workEmail && <Row label="Work Email" value={r.workEmail} />}
          {r.recommendedPersonalEmail && <Row label="Personal Email" value={r.recommendedPersonalEmail} />}
          {r.personalEmails
            .filter((e) => e !== r.recommendedPersonalEmail)
            .map((e, i) => (
              <Row key={`pe-${i}`} label="Email" value={e} />
            ))}
          {r.emails
            .filter((e) => e.address && e.address !== r.workEmail && e.address !== r.recommendedPersonalEmail)
            .slice(0, 5)
            .map((e, i) => (
              <Row key={`em-${i}`} label={e.type ?? "Email"} value={e.address ?? ""} />
            ))}
          {r.mobilePhone && <Row label="Mobile" value={r.mobilePhone} />}
          {r.phoneNumbers
            .filter((p) => p !== r.mobilePhone)
            .map((p, i) => (
              <Row key={`ph-${i}`} label="Phone" value={p} />
            ))}
          {r.phones.length > 0 && r.phoneNumbers.length === 0 && r.phones.map((p, i) => (
            <Row key={`phone-${i}`} label="Phone" value={p.number ?? ""} />
          ))}
          {r.possibleEmails.length > 0 && (
            <div className="py-1 pl-5">
              <p className="text-[10px] font-medium text-[#94a3b8]">Possible emails:</p>
              {r.possibleEmails.slice(0, 3).map((e, i) => (
                <p key={`pe-${i}`} className="text-[10px] text-[#64748b]">{e.address}</p>
              ))}
            </div>
          )}
          {r.possiblePhones.length > 0 && (
            <div className="py-1 pl-5">
              <p className="text-[10px] font-medium text-[#94a3b8]">Possible phones:</p>
              {r.possiblePhones.slice(0, 3).map((p, i) => (
                <p key={`pp-${i}`} className="text-[10px] text-[#64748b]">{p.number}</p>
              ))}
            </div>
          )}
        </AccordionSection>
      )}

      {/* Data Quality */}
      {hasMeta && (
        <AccordionSection value="metadata" icon={BarChart3} label="Data Quality">
          {r.numSources != null && <Row label="Sources" value={String(r.numSources)} />}
          {r.numRecords != null && <Row label="Records" value={String(r.numRecords)} />}
          {r.firstSeen && <Row label="First Seen" value={r.firstSeen} />}
        </AccordionSection>
      )}
    </Accordion>
  )
}

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

function AccordionSection({
  value,
  icon: Icon,
  label,
  children,
}: {
  value: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <AccordionItem value={value} className="border-b border-[#f1f5f9]">
      <AccordionTrigger className="py-2.5 hover:no-underline">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-[#1773cf]" />
          <span className="text-[11px] font-bold text-[#0f172a]">{label}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-2">{children}</AccordionContent>
    </AccordionItem>
  )
}

function LabelledInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-[#475569]">{label}</label>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#94a3b8]" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          className="h-8 pl-8 text-[12px]"
          disabled={disabled}
        />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5 pl-5">
      <span className="shrink-0 text-[11px] text-[#94a3b8]">{label}:</span>
      <span className="break-all text-[12px] font-medium text-[#0f172a]">{value}</span>
    </div>
  )
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  const s = start ? start.slice(0, 7) : "?"
  const e = end ? end.slice(0, 7) : "Present"
  return `${s} – ${e}`
}
