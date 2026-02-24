"use client"

import { Mail, Phone, MapPin, Briefcase, User, Heart, DollarSign, Calendar, Shield, Activity, Pill } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useLeadStore } from "@/lib/store/lead-store"
import { LeadEnrichmentPopover } from "@/components/quote/lead-enrichment-popover"
import type { EnrichmentResult, EnrichmentAutoFillData } from "@/lib/types"

/* ------------------------------------------------------------------ */
/*  Contact Info Card — compact lead summary above chat                 */
/* ------------------------------------------------------------------ */

interface ContactInfoCardProps {
  onEnrichmentResult: (result: EnrichmentResult) => void
  onAutoFill: (data: EnrichmentAutoFillData) => number
  onSendToChat: (text: string) => void
}

function InfoRow({ icon: Icon, value, amber }: { icon: React.ComponentType<{ className?: string }>; value: string | null; amber?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <Icon className={`h-3 w-3 shrink-0 ${amber ? "text-amber-500" : "text-muted-foreground/70"}`} />
      <span className={`truncate ${amber ? "text-amber-600 dark:text-amber-400" : ""}`}>{value}</span>
    </div>
  )
}

function formatCoverage(amount: number | null, term: number | null): string | null {
  if (!amount) return null
  const amountStr = amount >= 1_000_000
    ? `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(amount / 1000).toFixed(0)}K`
  return term ? `${amountStr} / ${term}yr` : amountStr
}

const INCOME_LABELS: Record<string, string> = {
  under_25k: "Under $25K",
  "25k_50k": "$25K–$50K",
  "50k_75k": "$50K–$75K",
  "75k_100k": "$75K–$100K",
  "100k_150k": "$100K–$150K",
  "150k_250k": "$150K–$250K",
  over_250k: "$250K+",
}

const MARITAL_LABELS: Record<string, string> = {
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
  domestic_partner: "Domestic Partner",
}

export function ContactInfoCard({
  onEnrichmentResult,
  onAutoFill,
  onSendToChat,
}: ContactInfoCardProps) {
  const lead = useLeadStore((s) => s.activeLead)

  if (!lead) return null

  const name = [lead.firstName, lead.lastName].filter(Boolean).join(" ")
  const location = [lead.city, lead.state, lead.zipCode].filter(Boolean).join(", ")
  const ageGender = [
    lead.age ? `${lead.age}yo` : null,
    lead.gender,
  ].filter(Boolean).join(" · ")

  const tobaccoLabel = lead.tobaccoStatus === "smoker"
    ? "Smoker"
    : null

  const conditionsLabel = lead.medicalConditions.length > 0
    ? lead.medicalConditions.join(", ")
    : null

  return (
    <div className="border-b border-border px-3 py-2.5">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1">
        {name && (
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-foreground truncate">{name}</p>
            {lead.enrichment && (
              <Badge variant="secondary" className="bg-green-50 text-green-700 text-[9px] px-1.5 py-0 dark:bg-green-900/30 dark:text-green-400">
                Enriched
              </Badge>
            )}
          </div>
        )}
        <InfoRow icon={Mail} value={lead.email} />
        <InfoRow icon={Phone} value={lead.phone} />
        <InfoRow icon={MapPin} value={location || null} />
        <InfoRow icon={Briefcase} value={lead.occupation} />
        <InfoRow icon={User} value={ageGender || null} />
        <InfoRow icon={Calendar} value={lead.dateOfBirth} />
        <InfoRow icon={Heart} value={lead.maritalStatus ? MARITAL_LABELS[lead.maritalStatus] ?? lead.maritalStatus : null} />
        <InfoRow icon={DollarSign} value={lead.incomeRange ? INCOME_LABELS[lead.incomeRange] ?? lead.incomeRange : null} />
        <InfoRow icon={Shield} value={formatCoverage(lead.coverageAmount, lead.termLength)} />
        <InfoRow icon={Activity} value={tobaccoLabel} amber />
        <InfoRow icon={Pill} value={conditionsLabel} amber />
        {lead.duiHistory && (
          <InfoRow icon={Shield} value="DUI history" amber />
        )}
      </div>
      <div className="mt-2">
        <LeadEnrichmentPopover
          onEnrichmentResult={onEnrichmentResult}
          onAutoFill={onAutoFill}
          onSendToChat={onSendToChat}
        />
      </div>
    </div>
  )
}
