"use client"

import { Mail, Phone, MapPin, Briefcase, User } from "lucide-react"
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

function InfoRow({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground/70" />
      <span className="truncate">{value}</span>
    </div>
  )
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

  return (
    <div className="border-b border-border px-3 py-2.5">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 space-y-1">
        {name && (
          <p className="text-[12px] font-semibold text-foreground truncate">{name}</p>
        )}
        <InfoRow icon={Mail} value={lead.email} />
        <InfoRow icon={Phone} value={lead.phone} />
        <InfoRow icon={MapPin} value={location || null} />
        <InfoRow icon={Briefcase} value={lead.occupation} />
        <InfoRow icon={User} value={ageGender || null} />
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
