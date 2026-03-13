"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import type { PanelImperativeHandle } from "react-resizable-panels"
import { useLeadStore } from "@/lib/store/lead-store"
import { KanbanBoard } from "@/components/leads/kanban-board"
import { LeadInfoPanel } from "@/components/leads/lead-info-panel"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { updateLeadFields } from "@/lib/actions/leads"
import { toast } from "sonner"
import type { Lead, LeadStatus } from "@/lib/types/lead"

export function PipelinePageClient() {
  const leads = useLeadStore((s) => s.leads)
  const isLoading = useLeadStore((s) => s.isLoading)
  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const detailPanelRef = useRef<PanelImperativeHandle | null>(null)

  const handleCardClick = useCallback((lead: Lead) => {
    setSelectedLead(lead)
    detailPanelRef.current?.expand()
    detailPanelRef.current?.resize(45)
  }, [])

  const handleClosePanel = useCallback(() => {
    detailPanelRef.current?.collapse()
    setSelectedLead(null)
  }, [])

  useEffect(() => {
    void hydrateLeads()
  }, [hydrateLeads])

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
        void hydrateLeads()
      }
    },
    [hydrateLeads],
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
      <div className="px-4 py-4">
        <h1 className="text-lg font-bold text-foreground">Pipeline</h1>
        <p className="text-xs text-muted-foreground">
          {activeLeads.length} active {activeLeads.length === 1 ? "deal" : "deals"}
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* ── Main panel: Kanban board ──────────────────────────────── */}
          <ResizablePanel id="pipeline-board" defaultSize={100} minSize={40}>
            <div className="h-full overflow-auto px-4 pb-4">
              <KanbanBoard leads={activeLeads} onStatusChange={handleStatusChange} onCardClick={handleCardClick} />
            </div>
          </ResizablePanel>

          {/* ── Detail panel: contact info sidebar ───────────────────── */}
          <ResizableHandle withHandle />
          <ResizablePanel
            id="pipeline-detail"
            panelRef={detailPanelRef}
            defaultSize={0}
            minSize={25}
            maxSize={60}
            collapsible
            collapsedSize={0}
          >
            {selectedLead && (
              <LeadInfoPanel
                lead={selectedLead}
                onClose={handleClosePanel}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
