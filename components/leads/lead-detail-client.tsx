"use client"

import { useMemo, useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Save, Loader2 } from "lucide-react"
import { QuoteWorkspace } from "@/components/quote/quote-workspace"
import { useLeadStore } from "@/lib/store/lead-store"
import { toast } from "sonner"
import { UnsavedChangesGuard } from "@/components/navigation/unsaved-changes-guard"
import { CallButton } from "@/components/calling/call-button"
import { ActiveCallBar } from "@/components/calling/active-call-bar"
import { CallLogViewer } from "@/components/calling/call-log-viewer"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadStatusBadge, LEAD_STATUSES, getStatusLabel } from "@/components/leads/lead-status-badge"
import type { LeadStatus } from "@/lib/types/lead"

interface LeadDetailClientProps {
  leadId: string
}

export function LeadDetailClient({ leadId }: LeadDetailClientProps) {
  const leads = useLeadStore((s) => s.leads)
  const activeLeadId = useLeadStore((s) => s.activeLead?.id ?? null)
  const dirtyFields = useLeadStore((s) => s.dirtyFields)
  const switchToLead = useLeadStore((s) => s.switchToLead)
  const hydrateLead = useLeadStore((s) => s.hydrateLead)
  const saveActiveLead = useLeadStore((s) => s.saveActiveLead)
  const updateActiveLead = useLeadStore((s) => s.updateActiveLead)
  const markFieldDirty = useLeadStore((s) => s.markFieldDirty)
  const isSaving = useLeadStore((s) => s.isSaving)

  const [isHydrating, setIsHydrating] = useState(false)
  const [hydrateError, setHydrateError] = useState<string | null>(null)
  const hasHydratedRef = useRef(false)

  const lead = useMemo(
    () => leads.find((l) => l.id === leadId) ?? null,
    [leads, leadId],
  )

  // Reset hydration ref when leadId changes
  useEffect(() => {
    hasHydratedRef.current = false
  }, [leadId])

  // Hydrate from Supabase if lead not in store (direct navigation)
  useEffect(() => {
    if (lead) return
    if (hasHydratedRef.current) return
    hasHydratedRef.current = true

    setIsHydrating(true)
    setHydrateError(null)

    hydrateLead(leadId).then((result) => {
      setIsHydrating(false)
      if (!result) {
        setHydrateError("Lead not found")
      }
    })
  }, [leadId, lead, hydrateLead])

  // Atomically set activeLead + restore quote data when the lead changes
  useEffect(() => {
    if (!lead) return
    if (activeLeadId === lead.id) return
    switchToLead(lead)
  }, [lead, activeLeadId, switchToLead])

  const handleSave = useCallback(async () => {
    const success = await saveActiveLead()
    if (success) {
      toast.success("Lead saved")
    } else {
      toast.error("Failed to save lead")
    }
  }, [saveActiveLead])

  const leadName = lead
    ? [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unnamed Lead"
    : "Lead Not Found"

  const isDirty = dirtyFields.size > 0

  const handleStatusChange = useCallback((newStatus: LeadStatus) => {
    updateActiveLead({
      status: newStatus,
      statusUpdatedAt: new Date().toISOString(),
    })
    markFieldDirty("status")
    markFieldDirty("statusUpdatedAt")
  }, [updateActiveLead, markFieldDirty])

  // Loading state — hydrating from Supabase
  if (isHydrating) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#f6f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1773cf]" />
        <p className="text-[13px] text-[#94a3b8]">Loading lead...</p>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#f6f7f8]">
        <p className="text-[16px] font-medium text-[#475569]">
          {hydrateError ?? "Lead not found."}
        </p>
        <p className="text-[13px] text-[#94a3b8]">
          This lead may have been deleted or the ID is invalid.
        </p>
        <Link
          href="/leads"
          className="mt-2 flex items-center gap-2 rounded-sm bg-[#1773cf] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#1565b8]"
        >
          Back to Leads
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f6f7f8]">
      <UnsavedChangesGuard isDirty={isDirty} />

      {/* Header — Breadcrumb + Lead Context */}
      <header className="flex items-center justify-between border-b border-[#e2e8f0] bg-white px-4 py-2 shadow-sm lg:px-6">
        <div className="flex items-center gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-[12px]">
            <Link
              href="/leads"
              className="flex items-center gap-1 font-medium text-[#64748b] transition-colors hover:text-[#0f172a]"
            >
              <ArrowLeft className="h-3 w-3" />
              Leads
            </Link>
            <ChevronRight className="h-3 w-3 text-[#cbd5e1]" />
            <span className="font-bold text-[#0f172a]">{leadName}</span>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-4 w-px bg-[#e2e8f0]" />

            <Select
              value={lead.status}
              onValueChange={(v) => handleStatusChange(v as LeadStatus)}
            >
              <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent px-1 shadow-none focus:ring-0">
                <LeadStatusBadge status={lead.status} />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {lead.source === "ai_agent" && (
              <span className="rounded-sm bg-[#ede9fe] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#7c3aed]">
                AI Agent
              </span>
            )}
            {lead.enrichment && (
              <span className="rounded-sm bg-[#dcfce7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#16a34a]">
                Enriched
              </span>
            )}
            {lead.quoteHistory.length > 0 && (
              <span className="rounded-sm bg-[#dbeafe] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#1773cf]">
                {lead.quoteHistory.length} Quote{lead.quoteHistory.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CallButton />

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 rounded-sm px-4 py-1.5 text-white disabled:opacity-60 ${
              isDirty
                ? "bg-[#ea580c] shadow-[0px_4px_6px_-1px_rgba(234,88,12,0.25)]"
                : "bg-[#1773cf] shadow-[0px_4px_6px_-1px_rgba(59,130,246,0.2)]"
            }`}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="text-[12px] font-bold">
              {isSaving ? "SAVING..." : isDirty ? "UNSAVED" : "SAVE"}
            </span>
          </button>
        </div>
      </header>

      {/* AI agent info banner */}
      {lead.source === "ai_agent" && (
        <div className="flex items-center gap-2 border-b border-violet-200 bg-violet-50 px-4 py-1.5 text-[12px] text-violet-700 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 lg:px-6">
          <span className="font-medium">
            This lead was collected by your AI voice agent
          </span>
          {lead.notes?.includes("URGENT") && (
            <span className="rounded-sm bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
              URGENT
            </span>
          )}
        </div>
      )}

      <ActiveCallBar />

      <QuoteWorkspace />

      <CallLogViewer leadId={leadId} />
    </div>
  )
}
