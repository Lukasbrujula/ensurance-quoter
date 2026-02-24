"use client"

import Link from "next/link"
import {
  User,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Calendar,
  Briefcase,
  DollarSign,
  Shield,
  Heart,
  AlertTriangle,
  Pill,
  Activity,
} from "lucide-react"
import { LeadStatusBadge } from "@/components/leads/lead-status-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Lead } from "@/lib/types/lead"

/* ------------------------------------------------------------------ */
/*  Avatar helpers                                                     */
/* ------------------------------------------------------------------ */

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-purple-600",
  "bg-cyan-600",
  "bg-orange-600",
  "bg-teal-600",
]

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return (parts[0]?.[0] ?? "?").toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

const INCOME_LABELS: Record<string, string> = {
  under_25k: "Under $25k",
  "25k_50k": "$25k–$50k",
  "50k_75k": "$50k–$75k",
  "75k_100k": "$75k–$100k",
  "100k_150k": "$100k–$150k",
  "150k_250k": "$150k–$250k",
  over_250k: "Over $250k",
}

const MARITAL_LABELS: Record<string, string> = {
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
  domestic_partner: "Domestic Partner",
}

function formatCoverage(amount: number | null): string | null {
  if (!amount) return null
  return amount >= 1_000_000
    ? `$${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(amount / 1_000).toFixed(0)}k`
}

/* ------------------------------------------------------------------ */
/*  Section component                                                  */
/* ------------------------------------------------------------------ */

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  amber,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null | undefined
  amber?: boolean
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 py-0.5">
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
          amber ? "text-amber-500" : "text-muted-foreground/60"
        }`}
      />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground/70">{label}</p>
        <p
          className={`text-[12px] ${
            amber
              ? "text-amber-600 dark:text-amber-400"
              : "text-foreground"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ConversationContact                                                */
/* ------------------------------------------------------------------ */

interface ConversationContactProps {
  lead: Lead | null
}

export function ConversationContact({ lead }: ConversationContactProps) {
  if (!lead) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20">
        <User className="h-8 w-8 text-muted-foreground/20" />
      </div>
    )
  }

  const leadName =
    [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed"
  const initials = getInitials(leadName)
  const avatarColor = getAvatarColor(leadName)

  const location = [lead.city, lead.state].filter(Boolean).join(", ")
  const fullAddress = [lead.address, location, lead.zipCode]
    .filter(Boolean)
    .join(", ")

  const coverageStr = formatCoverage(lead.coverageAmount)
  const coverageTerm = coverageStr && lead.termLength
    ? `${coverageStr} / ${lead.termLength}yr`
    : coverageStr

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header — avatar + name + status */}
      <div className="border-b border-border px-4 py-4 text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${avatarColor}`}
        >
          <span className="text-[18px] font-bold text-white">{initials}</span>
        </div>
        <p className="mt-2 text-[15px] font-semibold">{leadName}</p>
        <div className="mt-1 flex justify-center">
          <LeadStatusBadge status={lead.status} />
        </div>
      </div>

      {/* Scrollable detail sections */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 px-4 py-3">
          {/* Contact */}
          <Section title="Contact">
            <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            <InfoRow icon={Mail} label="Email" value={lead.email} />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={fullAddress || lead.state}
            />
          </Section>

          {/* Personal */}
          <Section title="Details">
            <InfoRow
              icon={User}
              label="Age / Gender"
              value={
                lead.age || lead.gender
                  ? [
                      lead.age ? `${lead.age}` : null,
                      lead.gender
                        ? lead.gender.charAt(0).toUpperCase() +
                          lead.gender.slice(1)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : null
              }
            />
            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={lead.dateOfBirth}
            />
            <InfoRow
              icon={Heart}
              label="Marital Status"
              value={
                lead.maritalStatus
                  ? MARITAL_LABELS[lead.maritalStatus] ?? lead.maritalStatus
                  : null
              }
            />
            <InfoRow
              icon={Briefcase}
              label="Occupation"
              value={lead.occupation}
            />
            <InfoRow
              icon={DollarSign}
              label="Income"
              value={
                lead.incomeRange
                  ? INCOME_LABELS[lead.incomeRange] ?? lead.incomeRange
                  : null
              }
            />
            {lead.dependents != null && lead.dependents > 0 && (
              <InfoRow
                icon={User}
                label="Dependents"
                value={`${lead.dependents}`}
              />
            )}
          </Section>

          {/* Insurance */}
          <Section title="Insurance">
            <InfoRow
              icon={Shield}
              label="Coverage / Term"
              value={coverageTerm}
            />
            <InfoRow
              icon={Activity}
              label="Tobacco"
              value={lead.tobaccoStatus ?? null}
              amber={
                lead.tobaccoStatus !== null &&
                lead.tobaccoStatus !== "non-smoker"
              }
            />
            {lead.medicalConditions.length > 0 && (
              <InfoRow
                icon={Pill}
                label="Conditions"
                value={lead.medicalConditions.join(", ")}
                amber
              />
            )}
            {lead.duiHistory && (
              <InfoRow
                icon={AlertTriangle}
                label="DUI"
                value={
                  lead.yearsSinceLastDui
                    ? `Yes (${lead.yearsSinceLastDui}yr ago)`
                    : "Yes"
                }
                amber
              />
            )}
            <InfoRow
              icon={Shield}
              label="Existing Coverage"
              value={lead.existingCoverage}
            />
          </Section>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="border-t border-border px-4 py-3">
        <Link
          href={`/leads/${lead.id}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-sm bg-[#1773cf] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#1565b8]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Lead
        </Link>
      </div>
    </div>
  )
}
