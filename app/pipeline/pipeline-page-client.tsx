"use client"

import { useEffect, useCallback, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useLeadStore } from "@/lib/store/lead-store"
import { useOrgMembers } from "@/hooks/use-org-members"
import { ScopeToggle, getDefaultScope, type Scope } from "@/components/shared/scope-toggle"
import { KanbanBoard } from "@/components/leads/kanban-board"
import { LeadInfoPanel } from "@/components/leads/lead-info-panel"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
import { updateLeadFields } from "@/lib/actions/leads"
import { toast } from "sonner"
import type { Lead, LeadStatus } from "@/lib/types/lead"

export function PipelinePageClient() {
  const leads = useLeadStore((s) => s.leads)
  const isLoading = useLeadStore((s) => s.isLoading)
  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)
  const { orgId, orgRole, userId } = useAuth()
  const [scope, setScope] = useState<Scope>(() => getDefaultScope(orgId, orgRole))
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const { getMemberName, getMember } = useOrgMembers()
  const showTeamMode = scope === "team" && !!orgId
  const isOrgAdmin = orgRole === "org:admin"

  const handleCardClick = useCallback((lead: Lead) => {
    setSelectedLead(lead)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedLead(null)
  }, [])

  useEffect(() => {
    void hydrateLeads(scope)
  }, [hydrateLeads, scope])

  const handleStatusChange = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      useLeadStore.setState((s) => ({
        leads: s.leads.map((l) =>
          l.id === leadId
            ? { ...l, status: newStatus, statusUpdatedAt: new Date().toISOString() }
            : l,
        ),
      }))

      const result = await updateLeadFields(leadId, {
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
      } as Partial<Lead>)

      if (!result.success) {
        toast.error("Failed to update status")
        void hydrateLeads(scope)
      }
    },
    [hydrateLeads, scope],
  )

  // Filter out dead leads — pipeline shows active deals only
  const activeLeads = leads.filter((l) => l.status !== "dead")

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading pipeline...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Pipeline</h1>
          <p className="text-xs text-muted-foreground">
            {activeLeads.length} active {activeLeads.length === 1 ? "deal" : "deals"}
          </p>
        </div>
        <ScopeToggle scope={scope} onScopeChange={setScope} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
        <KanbanBoard
          leads={activeLeads}
          onStatusChange={handleStatusChange}
          onCardClick={handleCardClick}
          agentLookup={showTeamMode ? {
            getName: getMemberName,
            getImageUrl: (agentId) => getMember(agentId)?.imageUrl ?? null,
          } : null}
          currentUserId={userId}
          isAdmin={isOrgAdmin}
        />
      </div>

      {/* ── Detail sheet: lead info sidebar ──────────────────────────── */}
      <Sheet open={selectedLead !== null} onOpenChange={(open) => { if (!open) handleClosePanel() }}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0 [&>button:first-child]:hidden">
          {selectedLead && (
            <LeadInfoPanel
              lead={selectedLead}
              onClose={handleClosePanel}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
