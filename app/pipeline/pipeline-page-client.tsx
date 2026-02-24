"use client"

import { useEffect, useCallback } from "react"
import { useLeadStore } from "@/lib/store/lead-store"
import { KanbanBoard } from "@/components/leads/kanban-board"
import { updateLeadFields } from "@/lib/actions/leads"
import { toast } from "sonner"
import type { Lead, LeadStatus } from "@/lib/types/lead"

export function PipelinePageClient() {
  const leads = useLeadStore((s) => s.leads)
  const isLoading = useLeadStore((s) => s.isLoading)
  const hydrateLeads = useLeadStore((s) => s.hydrateLeads)

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
    <div className="flex flex-1 flex-col overflow-hidden p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Pipeline</h1>
          <p className="text-xs text-muted-foreground">
            {activeLeads.length} active {activeLeads.length === 1 ? "deal" : "deals"}
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <KanbanBoard leads={activeLeads} onStatusChange={handleStatusChange} />
      </div>
    </div>
  )
}
